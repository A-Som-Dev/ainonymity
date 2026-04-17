import { describe, it, expect } from 'vitest';
import { validateRawConfig, hasErrors } from '../../src/config/validate.js';

describe('config validation', () => {
  it('accepts a minimal valid config', () => {
    const issues = validateRawConfig({
      version: 1,
      behavior: { port: 8100 },
      code: { language: 'typescript', domain_terms: [] },
    });
    expect(hasErrors(issues)).toBe(false);
  });

  it('rejects a port outside 1-65535', () => {
    const issues = validateRawConfig({ behavior: { port: 99999 } });
    const err = issues.find((i) => i.path === 'behavior.port');
    expect(err?.severity).toBe('error');
  });

  it('rejects a non-http upstream URL', () => {
    const issues = validateRawConfig({
      behavior: { upstream: { anthropic: 'ftp://evil.example' } },
    });
    expect(hasErrors(issues)).toBe(true);
  });

  it('rejects plain http upstream (api key would leak)', () => {
    const issues = validateRawConfig({
      behavior: { upstream: { anthropic: 'http://api.anthropic.com' } },
    });
    const err = issues.find((i) => i.path === 'behavior.upstream.anthropic');
    expect(err?.severity).toBe('error');
  });

  it('rejects user-info redirect attack', () => {
    const issues = validateRawConfig({
      behavior: { upstream: { anthropic: 'https://api.anthropic.com@attacker.com' } },
    });
    const err = issues.find((i) => i.path === 'behavior.upstream.anthropic');
    expect(err?.severity).toBe('error');
    expect(err?.message).toMatch(/user-info|redirect/i);
  });

  it('rejects a foreign host masquerading as anthropic', () => {
    const issues = validateRawConfig({
      behavior: { upstream: { anthropic: 'https://evil.example.com' } },
    });
    expect(hasErrors(issues)).toBe(true);
  });

  it('accepts localhost upstream for dev/test', () => {
    const issues = validateRawConfig({
      behavior: { upstream: { anthropic: 'https://localhost:8443' } },
    });
    const err = issues.find((i) => i.path === 'behavior.upstream.anthropic');
    expect(err).toBeUndefined();
  });

  it('accepts the canonical https upstream', () => {
    const issues = validateRawConfig({
      behavior: { upstream: { anthropic: 'https://api.anthropic.com' } },
    });
    const err = issues.find((i) => i.path === 'behavior.upstream.anthropic');
    expect(err).toBeUndefined();
  });

  it('warns about unknown top-level fields', () => {
    const issues = validateRawConfig({ totally_unknown: 'x' });
    const warn = issues.find((i) => i.path === 'totally_unknown');
    expect(warn?.severity).toBe('warning');
  });

  it('rejects non-array code.domain_terms', () => {
    const issues = validateRawConfig({ code: { domain_terms: 'CustomerOrder' } });
    expect(hasErrors(issues)).toBe(true);
  });

  it('rejects secrets.patterns without regex field', () => {
    const issues = validateRawConfig({
      secrets: { patterns: [{ name: 'broken' }] },
    });
    expect(hasErrors(issues)).toBe(true);
  });

  it('accepts a 16+ char behavior.mgmt_token', () => {
    const issues = validateRawConfig({
      behavior: { mgmt_token: 'abcdefghijklmnop' },
    });
    expect(hasErrors(issues)).toBe(false);
  });

  it('rejects a too-short behavior.mgmt_token', () => {
    const issues = validateRawConfig({
      behavior: { mgmt_token: 'tooshort' },
    });
    const err = issues.find((i) => i.path === 'behavior.mgmt_token');
    expect(err?.severity).toBe('error');
  });

  it('rejects a non-string behavior.mgmt_token', () => {
    const issues = validateRawConfig({
      behavior: { mgmt_token: 123 },
    });
    const err = issues.find((i) => i.path === 'behavior.mgmt_token');
    expect(err?.severity).toBe('error');
  });
});
