import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { AuditLogger } from '../../src/audit/logger.js';

const cliPath = join(process.cwd(), 'dist/cli/index.js');

function runVerify(dir: string, extra: string[] = []): { stdout: string; status: number } {
  try {
    const stdout = execFileSync('node', [cliPath, 'audit', 'verify', '--dir', dir, ...extra], {
      encoding: 'utf-8',
    });
    return { stdout, status: 0 };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; status?: number };
    return { stdout: (e.stdout ?? '') + (e.stderr ?? ''), status: e.status ?? 1 };
  }
}

describe('audit verify subcommand', () => {
  let workdir: string;

  beforeEach(() => {
    workdir = mkdtempSync(join(tmpdir(), 'ain-audit-'));
  });

  afterEach(() => {
    try {
      rmSync(workdir, { recursive: true, force: true });
    } catch {}
  });

  it('exits 1 when no audit logs exist', () => {
    const { status, stdout } = runVerify(workdir);
    expect(status).toBe(1);
    expect(stdout).toMatch(/No audit logs/);
  });

  it('exits 0 on a clean intact chain', () => {
    const logger = new AuditLogger();
    logger.enablePersistence(workdir);
    logger.log({
      original: 'a',
      pseudonym: 'Alpha',
      layer: 'identity',
      type: 'person-name',
      offset: 0,
      length: 1,
    });
    logger.log({
      original: 'b',
      pseudonym: 'Beta',
      layer: 'identity',
      type: 'person-name',
      offset: 0,
      length: 1,
    });

    const { status, stdout } = runVerify(workdir);
    expect(status).toBe(0);
    expect(stdout).toMatch(/ok\s+/);
  });

  it('exits 2 on tamper (edited JSONL line)', () => {
    const logger = new AuditLogger();
    logger.enablePersistence(workdir);
    logger.log({
      original: 'a',
      pseudonym: 'Alpha',
      layer: 'identity',
      type: 'person-name',
      offset: 0,
      length: 1,
    });
    logger.log({
      original: 'b',
      pseudonym: 'Beta',
      layer: 'identity',
      type: 'person-name',
      offset: 0,
      length: 1,
    });

    const files = readdirSync(workdir);
    const logFile = files.find((f) => f.endsWith('.jsonl'));
    if (!logFile) throw new Error('no log file created');
    const fullPath = join(workdir, logFile);
    const original = readFileSync(fullPath, 'utf-8');
    const tampered = original.replace('person-name@0:1', 'person-name@0:9');
    writeFileSync(fullPath, tampered, 'utf-8');

    const { status, stdout } = runVerify(workdir);
    expect(status).toBe(2);
    expect(stdout).toMatch(/tamper/);
  });

  it('exits 3 when --strict is set and checkpoint is missing', () => {
    const logger = new AuditLogger();
    logger.enablePersistence(workdir);
    logger.log({
      original: 'a',
      pseudonym: 'Alpha',
      layer: 'identity',
      type: 'person-name',
      offset: 0,
      length: 1,
    });

    const files = readdirSync(workdir);
    const ckpt = files.find((f) => f.endsWith('.checkpoint'));
    if (ckpt) rmSync(join(workdir, ckpt));

    const { status, stdout } = runVerify(workdir, ['--strict']);
    expect(status).toBe(3);
    expect(stdout).toMatch(/missing/);
  });
});
