import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Command } from 'commander';
import type { AuditEntry } from '../types.js';
import { verifyAuditChain } from '../audit/logger.js';

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

function sanitizeForTty(raw: string): string {
  let out = '';
  for (const ch of raw) {
    const cp = ch.codePointAt(0) ?? 0;
    if (cp < 0x20 && cp !== 0x09) continue;
    if (cp === 0x7f) continue;
    out += ch;
  }
  return out;
}

function formatEntry(e: AuditEntry): string {
  const ts = new Date(e.timestamp).toISOString().replace('T', ' ').slice(0, 19);
  return `${ts}  [${e.layer}]  ${e.type}  hash:${e.originalHash.slice(0, 8)}  (${sanitizeForTty(
    e.context,
  )})`;
}

interface VerifyResult {
  file: string;
  status: 'ok' | 'tamper' | 'missing-checkpoint';
  badSeq?: number;
  lastSeq?: number;
}

function verifyFile(path: string, strict: boolean): VerifyResult {
  const ckptPath = path + '.checkpoint';
  const lines = readFileSync(path, 'utf-8').split('\n');

  let expected: { lastSeq: number; lastHash: string } | 'required' | undefined;
  if (existsSync(ckptPath)) {
    try {
      expected = JSON.parse(readFileSync(ckptPath, 'utf-8')) as {
        lastSeq: number;
        lastHash: string;
      };
    } catch {
      return { file: path, status: 'tamper', badSeq: -1 };
    }
  } else if (strict) {
    expected = 'required';
  }

  const bad = verifyAuditChain(lines, expected);
  if (bad !== null) {
    if (expected === 'required') {
      return { file: path, status: 'missing-checkpoint' };
    }
    return { file: path, status: 'tamper', badSeq: bad };
  }
  const lastEntry = lines
    .filter((l) => l.trim())
    .map((l) => {
      try {
        return JSON.parse(l) as AuditEntry;
      } catch {
        return null;
      }
    })
    .filter((e): e is AuditEntry => e !== null)
    .at(-1);
  return { file: path, status: 'ok', lastSeq: lastEntry?.seq };
}

function warnIfChainBroken(dir: string): void {
  const files = findLogFiles(dir);
  const broken: VerifyResult[] = [];
  for (const f of files) {
    const res = verifyFile(f, false);
    if (res.status !== 'ok') broken.push(res);
  }
  if (broken.length > 0) {
    console.error(`WARNING: audit chain integrity issues in ${broken.length} file(s):`);
    for (const b of broken) {
      console.error(`  ${b.file}: ${b.status}${b.badSeq !== undefined ? ` @seq=${b.badSeq}` : ''}`);
    }
    console.error(`Run 'ainonymous audit verify --dir ${dir} --strict' for details.`);
  }
}

export function registerAuditCmd(program: Command): void {
  const audit = program.command('audit').description('Inspect and export audit logs');

  audit
    .command('verify')
    .description('Verify hash-chain integrity across all audit log files')
    .option('--dir <path>', 'audit log directory', './ainonymous-audit')
    .option('--strict', 'require a checkpoint sidecar to exist for every log file')
    .action((opts: { dir: string; strict?: boolean }) => {
      const dir = resolve(opts.dir);
      const files = findLogFiles(dir);
      if (files.length === 0) {
        console.error(`No audit logs found in ${dir}`);
        process.exit(1);
      }

      let tamper = 0;
      let missing = 0;
      let totalEntries = 0;
      for (const f of files) {
        const res = verifyFile(f, !!opts.strict);
        if (res.status === 'ok') {
          totalEntries += (res.lastSeq ?? -1) + 1;
          console.log(`  ok      ${f}  (seq 0..${res.lastSeq ?? '?'})`);
        } else if (res.status === 'missing-checkpoint') {
          missing++;
          console.log(`  missing ${f}  (no .checkpoint under --strict)`);
        } else {
          tamper++;
          console.log(`  tamper  ${f}  (break at seq ${res.badSeq})`);
        }
      }

      console.log(
        `\n${files.length} file(s), ${totalEntries} verified entries, ${tamper} tamper, ${missing} missing-checkpoint`,
      );

      if (tamper > 0) process.exit(2);
      if (missing > 0) process.exit(3);
    });

  audit
    .command('tail')
    .description('Show last 20 entries from the current log')
    .option('--dir <path>', 'audit log directory', './ainonymous-audit')
    .option('-n, --lines <number>', 'number of entries to show', '20')
    .action((opts: { dir: string; lines: string }) => {
      const dir = resolve(opts.dir);
      warnIfChainBroken(dir);
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
      warnIfChainBroken(dir);
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
      warnIfChainBroken(dir);
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
