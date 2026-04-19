import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { AuditLogger, AuditPersistError } from '../../src/audit/logger.js';

const FAKE_REPL = {
  original: 'alice@example.com',
  pseudonym: 'user1@company-alpha.com',
  layer: 'identity' as const,
  type: 'email',
  offset: 0,
  length: 17,
};

function forceFailure(workdir: string): void {
  rmSync(workdir, { recursive: true, force: true });
}

describe('AuditLogger failure modes', () => {
  let workdir: string;

  beforeEach(() => {
    workdir = mkdtempSync(join(tmpdir(), 'ain-fail-'));
  });

  afterEach(() => {
    try {
      chmodSync(workdir, 0o700);
      rmSync(workdir, { recursive: true, force: true });
    } catch {}
  });

  it('permit mode: logs warning on persist failure but does not throw', () => {
    const logger = new AuditLogger();
    logger.enablePersistence(workdir, 'permit');
    forceFailure(workdir);

    const errors: string[] = [];
    const origErr = console.error;
    console.error = (msg: string) => errors.push(msg);
    try {
      expect(() => logger.log(FAKE_REPL)).not.toThrow();
    } finally {
      console.error = origErr;
    }
    expect(errors.some((e) => e.includes('audit persist failed'))).toBe(true);
  });

  it('block mode: throws AuditPersistError on persist failure', () => {
    const logger = new AuditLogger();
    logger.enablePersistence(workdir, 'block');
    forceFailure(workdir);

    expect(() => logger.log(FAKE_REPL)).toThrow(AuditPersistError);
  });

  it('default mode is permit', () => {
    const logger = new AuditLogger();
    logger.enablePersistence(workdir);
    forceFailure(workdir);

    const errors: string[] = [];
    const origErr = console.error;
    console.error = (msg: string) => errors.push(msg);
    try {
      expect(() => logger.log(FAKE_REPL)).not.toThrow();
    } finally {
      console.error = origErr;
    }
  });
});
