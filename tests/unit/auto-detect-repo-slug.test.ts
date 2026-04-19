import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { autoDetect } from '../../src/config/auto-detect.js';

describe('Auto-detect includes the full kebab-case repo slug as domain term', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'ain-autodetect-slug-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('adds the directory basename (kebab-case) as a domain term', () => {
    const slug = 'acme-line-mgmt-kafka';
    const repoDir = join(dir, slug);
    mkdirSync(repoDir);
    writeFileSync(join(repoDir, 'pom.xml'), '<project><artifactId>foo</artifactId></project>');
    const config = autoDetect(repoDir);
    expect(config.code.domainTerms).toContain(slug);
  });
});
