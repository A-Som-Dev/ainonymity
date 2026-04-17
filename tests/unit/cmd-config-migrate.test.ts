import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';

const cliPath = join(process.cwd(), 'dist/cli/index.js');

function runMigrate(dir: string, extra: string[] = []): string {
  return execFileSync('node', [cliPath, 'config', 'migrate', '--dir', dir, ...extra], {
    encoding: 'utf-8',
    env: { ...process.env, CI: '1' },
  });
}

describe('config migrate', () => {
  let workdir: string;

  beforeEach(() => {
    workdir = mkdtempSync(join(tmpdir(), 'ain-migrate-'));
  });

  afterEach(() => {
    try {
      rmSync(workdir, { recursive: true, force: true });
    } catch {}
  });

  it('writes .migrated sibling without touching the original', () => {
    const src = join(workdir, '.ainonymous.yml');
    writeFileSync(src, 'identity:\n  company: acme\n  domains:\n    - acme.de\n', 'utf-8');
    runMigrate(workdir);
    expect(existsSync(`${src}.migrated`)).toBe(true);
    expect(readFileSync(src, 'utf-8')).toContain('company: acme');
    const migrated = readFileSync(`${src}.migrated`, 'utf-8');
    expect(migrated).toContain('version: 1');
    expect(migrated).toContain('aggression: medium');
  });

  it('in-place keeps a backup with 0o600 on posix', () => {
    const src = join(workdir, '.ainonymous.yml');
    writeFileSync(src, 'identity:\n  company: acme\n', 'utf-8');
    runMigrate(workdir, ['--in-place']);
    const backup = readdirSyncFiles(workdir).find((f) => f.startsWith('.ainonymous.yml.backup-'));
    expect(backup, 'backup file expected').toBeDefined();
    if (process.platform !== 'win32') {
      const mode = statSync(join(workdir, backup!)).mode & 0o777;
      expect(mode).toBe(0o600);
    }
    const current = readFileSync(src, 'utf-8');
    expect(current).toContain('version: 1');
  });

  it('pins aggression=high when --keep-v1-aggression is set', () => {
    const src = join(workdir, '.ainonymous.yml');
    writeFileSync(src, 'identity:\n  company: acme\n', 'utf-8');
    runMigrate(workdir, ['--keep-v1-aggression']);
    const migrated = readFileSync(`${src}.migrated`, 'utf-8');
    expect(migrated).toContain('aggression: high');
  });

  it('passes existing explicit aggression through', () => {
    const src = join(workdir, '.ainonymous.yml');
    writeFileSync(
      src,
      'version: 1\nbehavior:\n  aggression: low\nidentity:\n  company: acme\n',
      'utf-8',
    );
    runMigrate(workdir);
    const migrated = readFileSync(`${src}.migrated`, 'utf-8');
    expect(migrated).toContain('aggression: low');
  });
});

function readdirSyncFiles(dir: string): string[] {
  return readdirSync(dir);
}
