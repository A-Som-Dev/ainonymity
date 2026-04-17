import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import type { Command } from 'commander';
import { loadConfig } from '../config/loader.js';
import { Pipeline } from '../pipeline/pipeline.js';
import { AuditLogger } from '../audit/logger.js';
import { createProxyServer } from '../proxy/server.js';
import { listenWithFallback } from './listen-with-fallback.js';
import { SKIP_DIRS, decodeWithBom } from '../shared.js';
import type { Replacement } from '../types.js';

const SOURCE_EXTS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.py',
  '.java',
  '.kt',
  '.go',
  '.rs',
  '.rb',
  '.php',
  '.json',
  '.yml',
  '.yaml',
  '.toml',
  '.ini',
  '.cfg',
  '.conf',
  '.sh',
  '.bash',
  '.zsh',
  '.html',
  '.css',
  '.scss',
  '.sql',
  '.md',
  '.txt',
  '.properties',
  '.xml',
  '.gradle',
  '.kts',
]);

const DOTENV_RE = /^\.env(\..+)?$/;

const HIGH_FINDINGS_THRESHOLD = 100;

interface FileReport {
  path: string;
  replacements: Replacement[];
}

export function registerScanCmd(program: Command): void {
  program
    .command('scan')
    .description('Dry run: show what would be anonymized')
    .option('-d, --dir <path>', 'project directory', process.cwd())
    .option('--limit <number>', 'max files to scan', '50')
    .option('-v, --verbose', 'print every finding per file (raw dump)')
    .option('--dashboard', 'show live dashboard during scan')
    .option(
      '--preview <n>',
      'instead of a summary, print the before/after text for the first N files that have findings',
    )
    .action(
      async (opts: {
        dir: string;
        limit: string;
        verbose?: boolean;
        dashboard?: boolean;
        preview?: string;
      }) => {
        const limit = parseInt(opts.limit, 10);
        const config = loadConfig(opts.dir);
        const logger = new AuditLogger();
        const pipeline = new Pipeline(config, logger);

        let dashServer: ReturnType<typeof createProxyServer> | null = null;
        if (opts.dashboard) {
          dashServer = createProxyServer({ config, logger, pipeline });
          const port = await listenWithFallback(dashServer, config.behavior.port, '127.0.0.1');
          console.log(`Dashboard: http://127.0.0.1:${port}/dashboard`);
        }

        const files = collectFiles(opts.dir, limit);
        const reports: FileReport[] = [];
        const previewLimit = opts.preview ? parseInt(opts.preview, 10) : 0;
        let previewPrinted = 0;

        for (const filePath of files) {
          const content = readSafe(filePath);
          if (!content) continue;

          const rel = relative(opts.dir, filePath);
          const result = await pipeline.anonymize(content, rel);
          if (result.replacements.length === 0) continue;

          reports.push({ path: rel, replacements: result.replacements });

          if (previewLimit > 0 && previewPrinted < previewLimit) {
            previewPrinted++;
            console.log(`\n========== ${rel} ==========`);
            console.log('--- BEFORE (what leaves your machine WITHOUT the proxy) ---');
            console.log(snippet(content));
            console.log('--- AFTER  (what upstream actually sees) ---');
            console.log(snippet(result.text));
          } else if (opts.verbose) {
            console.log(`\n${rel} (${result.replacements.length} findings)`);
            for (const r of result.replacements) {
              console.log(
                `  [${r.layer}/${r.type}] (${r.original.length} chars) → "${r.pseudonym}"`,
              );
            }
          }
        }

        if (previewLimit > 0) {
          console.log(
            `\nPreviewed ${previewPrinted} file(s). Run without --preview for the summary histogram.`,
          );
        } else if (!opts.verbose) {
          printSummaryReport(reports, files.length, pipeline.getSessionMap().size);
        } else {
          console.log(`\n--- Scan Summary ---`);
          console.log(`Files scanned: ${files.length}`);
          console.log(`Files with findings: ${reports.length}`);
          console.log(`Total findings: ${reports.reduce((s, r) => s + r.replacements.length, 0)}`);
          console.log(
            `Session map: ${pipeline.getSessionMap().size} unique pseudonyms (shared across files)`,
          );
        }

        if (dashServer) {
          console.log('\nDashboard still running. Press Ctrl+C to stop.');
          await new Promise(() => {});
        }
      },
    );
}

function snippet(text: string, max = 1500): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n... (${text.length - max} chars truncated)`;
}

function printSummaryReport(reports: FileReport[], scanned: number, mapSize: number): void {
  const total = reports.reduce((s, r) => s + r.replacements.length, 0);

  console.log(`\n=== Scan Summary ===`);
  console.log(`Files scanned:       ${scanned}`);
  console.log(`Files with findings: ${reports.length}`);
  console.log(`Total findings:      ${total}`);
  console.log(`Unique pseudonyms:   ${mapSize}`);

  if (total === 0) {
    console.log('\nNo findings. Either the project is clean or your config is too narrow.');
    return;
  }

  const byType = new Map<string, number>();
  const pseudoFreq = new Map<string, number>();
  for (const r of reports) {
    for (const repl of r.replacements) {
      const key = `${repl.layer}/${repl.type}`;
      byType.set(key, (byType.get(key) ?? 0) + 1);
      pseudoFreq.set(repl.pseudonym, (pseudoFreq.get(repl.pseudonym) ?? 0) + 1);
    }
  }

  console.log(`\n=== Findings by type ===`);
  const typeRows = [...byType.entries()].sort((a, b) => b[1] - a[1]);
  const widest = Math.max(...typeRows.map(([k]) => k.length));
  for (const [type, count] of typeRows) {
    console.log(`  ${type.padEnd(widest)}  ${count.toString().padStart(6)}`);
  }

  console.log(`\n=== Top files by finding count ===`);
  const topFiles = [...reports]
    .sort((a, b) => b.replacements.length - a.replacements.length)
    .slice(0, 10);
  const widestPath = Math.max(...topFiles.map((r) => r.path.length));
  for (const r of topFiles) {
    const warn = r.replacements.length >= HIGH_FINDINGS_THRESHOLD ? '  ⚠ high aggression' : '';
    console.log(
      `  ${r.path.padEnd(widestPath)}  ${r.replacements.length.toString().padStart(6)}${warn}`,
    );
  }

  const topPseudo = [...pseudoFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  if (topPseudo.length > 0) {
    console.log(`\n=== Most frequent pseudonyms ===`);
    const widestPs = Math.max(...topPseudo.map(([p]) => p.length));
    for (const [p, count] of topPseudo) {
      console.log(`  ${p.padEnd(widestPs)}  ${count.toString().padStart(6)}`);
    }
  }

  const hotFiles = reports.filter((r) => r.replacements.length >= HIGH_FINDINGS_THRESHOLD).length;
  if (hotFiles > 0) {
    console.log(`\n⚠ ${hotFiles} file(s) have ≥${HIGH_FINDINGS_THRESHOLD} findings. Consider:`);
    console.log(`  - extend code.preserve with project-specific identifiers`);
    console.log(`  - trim code.domain_terms to only real project terms`);
    console.log(`  - run with --verbose to inspect the raw dump`);
  }
}

function collectFiles(dir: string, limit: number): string[] {
  const result: string[] = [];

  function walk(current: string): void {
    if (result.length >= limit) return;

    let entries;
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (result.length >= limit) return;

      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name) && !entry.name.startsWith('.')) {
          walk(join(current, entry.name));
        }
        continue;
      }

      if (entry.isFile()) {
        const name = entry.name;
        // The tool's own config would otherwise show up as a file full of
        // company/person/domain-term hits. they were written there on
        // purpose. Scanning it back is noise.
        if (name === '.ainonymous.yml' || name === '.ainonymity.yml') continue;
        const ext = extname(name).toLowerCase();
        if (SOURCE_EXTS.has(ext) || DOTENV_RE.test(name)) {
          result.push(join(current, name));
        }
      }
    }
  }

  walk(dir);
  return result;
}

function readSafe(filePath: string): string | null {
  try {
    const stat = statSync(filePath);
    if (stat.size > 512 * 1024) return null;
    return decodeWithBom(readFileSync(filePath));
  } catch {
    return null;
  }
}
