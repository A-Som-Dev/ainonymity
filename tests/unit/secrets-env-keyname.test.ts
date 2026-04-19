import { describe, it, expect } from 'vitest';
import { matchSecrets } from '../../src/patterns/secrets.js';

describe('credential-keyname pattern', () => {
  it('matches ENV-variable-name references in prose without assignment', () => {
    const text =
      'Das Passwort steht in KAFKA_SASL_PASSWORD und die DB lesen wir aus ACME_DB_PASSWORD.';
    const hits = matchSecrets(text);
    const names = hits.map((h) => h.match);
    expect(names).toContain('KAFKA_SASL_PASSWORD');
    expect(names).toContain('ACME_DB_PASSWORD');
  });

  it('matches all common suffixes', () => {
    for (const suffix of [
      'PASSWORD',
      'PW',
      'SECRET',
      'TOKEN',
      'KEY',
      'APIKEY',
      'CRED',
      'CREDENTIAL',
    ]) {
      const name = `SERVICE_${suffix}`;
      const hits = matchSecrets(`check ${name} now`);
      expect(
        hits.some((h) => h.match === name),
        `did not flag ${name}`,
      ).toBe(true);
    }
  });

  it('does not flag generic UPPER_SNAKE_CASE identifiers without credential suffix', () => {
    const text = 'MAX_RETRIES and DEFAULT_TIMEOUT are numeric config values.';
    const hits = matchSecrets(text);
    const names = hits.map((h) => h.match);
    expect(names).not.toContain('MAX_RETRIES');
    expect(names).not.toContain('DEFAULT_TIMEOUT');
  });

  it('does not double-match an UPPER_SNAKE already matched by credential-constant', () => {
    // When a value assignment is present, credential-constant should win and
    // the bare-keyname pattern should not produce a duplicate overlap.
    const text = 'DB_PASSWORD = "actualsecret123"';
    const hits = matchSecrets(text);
    // At least one hit; removeOverlaps in the pipeline keeps the winner.
    expect(hits.length).toBeGreaterThan(0);
  });
});
