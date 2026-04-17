import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Command } from 'commander';
import type { AuditEntry } from '../types.js';

function findLogFiles(dir: string): string[] {
  try {
    return readdirSync(dir)
      .filter((f) => f.startsWith('ainonymous-audit-') && f.endsWith('.jsonl'))
      .sort()
      .map((f) => join(dir, f));
  } catch {
    return [];
  }
}

function readJsonlFile(path: string): AuditEntry[] {
  const content = readFileSync(path, 'utf-8');
  const entries: AuditEntry[] = [];
  let lineNo = 0;
  for (const line of content.split('\n')) {
    lineNo++;
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      entries.push(JSON.parse(trimmed) as AuditEntry);
    } catch {
      console.error(`Skipping malformed JSONL line ${lineNo} in ${path}`);
    }
  }
  return entries;
}

function readAllEntries(dir: string): AuditEntry[] {
  const files = findLogFiles(dir);
  const all: AuditEntry[] = [];
  for (const f of files) {
    all.push(...readJsonlFile(f));
  }
  return all;
}

function formatEntry(e: AuditEntry): string {
  const ts = new Date(e.timestamp).toISOString().replace('T', ' ').slice(0, 19);
  return `${ts}  [${e.layer}]  ${e.type}  hash:${e.originalHash.slice(0, 8)}  (${e.context})`;
}

export function registerAuditCmd(program: Command): void {
  const audit = program.command('audit').description('Inspect and export audit logs');

  audit
    .command('tail')
    .description('Show last 20 entries from the current log')
    .option('--dir <path>', 'audit log directory', './ainonymous-audit')
    .option('-n, --lines <number>', 'number of entries to show', '20')
    .action((opts: { dir: string; lines: string }) => {
      const dir = resolve(opts.dir);
      const count = parseInt(opts.lines, 10);
      const entries = readAllEntries(dir);

      if (entries.length === 0) {
        console.log(`No audit logs found in ${dir}`);
        return;
      }

      const tail = entries.slice(-count);
      for (const e of tail) {
        console.log(formatEntry(e));
      }
      console.log(`\n${entries.length} total entries across ${findLogFiles(dir).length} file(s)`);
    });

  audit
    .command('pending')
    .description('Show anonymized originals the LLM never referenced in its response')
    .option('--dir <path>', 'audit log directory', './ainonymous-audit')
    .action((opts: { dir: string }) => {
      const dir = resolve(opts.dir);
      const entries = readAllEntries(dir);

      if (entries.length === 0) {
        console.log(`No audit logs found in ${dir}`);
        return;
      }

      const anonymized = new Map<string, AuditEntry>();
      const rehydrated = new Set<string>();
      for (const e of entries) {
        if (e.layer === 'rehydration') {
          rehydrated.add(e.originalHash);
        } else if (!anonymized.has(e.originalHash)) {
          anonymized.set(e.originalHash, e);
        }
      }

      const pending: AuditEntry[] = [];
      for (const [hash, entry] of anonymized) {
        if (!rehydrated.has(hash)) pending.push(entry);
      }

      if (pending.length === 0) {
        console.log('No pending pseudonyms. All anonymized originals were rehydrated.');
        return;
      }

      pending.sort((a, b) => a.timestamp - b.timestamp);
      for (const e of pending) {
        console.log(formatEntry(e));
      }
      console.log(
        `\n${pending.length} pending of ${anonymized.size} anonymized (${rehydrated.size} rehydrated)`,
      );
    });

  audit
    .command('export')
    .description('Export all audit logs as consolidated JSON')
    .option('--dir <path>', 'audit log directory', './ainonymous-audit')
    .option('--output <path>', 'output file path', 'ainonymous-audit-export.json')
    .option('--from <date>', 'start date (YYYY-MM-DD)')
    .option('--to <date>', 'end date (YYYY-MM-DD)')
    .action((opts: { dir: string; output: string; from?: string; to?: string }) => {
      const dir = resolve(opts.dir);
      let entries = readAllEntries(dir);

      if (opts.from) {
        const fromTs = new Date(opts.from).getTime();
        entries = entries.filter((e) => e.timestamp >= fromTs);
      }
      if (opts.to) {
        const toTs = new Date(opts.to + 'T23:59:59.999Z').getTime();
        entries = entries.filter((e) => e.timestamp <= toTs);
      }

      if (entries.length === 0) {
        console.log(`No audit entries found in ${dir}`);
        return;
      }

      const outPath = resolve(opts.output);
      writeFileSync(outPath, JSON.stringify(entries, null, 2), 'utf-8');
      console.log(`Exported ${entries.length} entries to ${outPath}`);
    });
}
