import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { CodeLayer } from '../../src/pipeline/layer3-code.js';
import { BiMap } from '../../src/session/map.js';
import { getDefaults } from '../../src/config/loader.js';
import { initParser } from '../../src/ast/extractor.js';
import type { PipelineContext } from '../../src/types.js';

function ctx(lang = 'java'): PipelineContext {
  const defaults = getDefaults();
  return {
    sessionMap: new BiMap(),
    config: {
      ...defaults,
      identity: { ...defaults.identity, company: 'acme', domains: ['acme.com'] },
      behavior: { ...defaults.behavior, aggression: 'medium' },
      code: { ...defaults.code, language: lang, domainTerms: [], preserve: [] },
    },
  };
}

describe('Layer 3 inline-backtick zones', () => {
  let layer: CodeLayer;

  beforeAll(async () => {
    await initParser();
  });

  beforeEach(() => {
    layer = new CodeLayer();
  });

  it('treats inline-backtick identifiers in prose as code and pseudonymizes them', async () => {
    // The user quotes a class name inline. this was leaking in the hardcore
    // E2E (LineTerminationCompleted). The token must be extracted and mapped
    // the same way as fenced code.
    const text = 'Wir triggern die Camunda-Correlation fuer `LineTerminationCompleted` im Consumer.';
    const result = await layer.processAsync(text, ctx());

    expect(result.text).not.toContain('LineTerminationCompleted');
  });

  it('leaves true prose words outside fences and backticks alone', async () => {
    const text = 'Die Integration, der nach dem Event published.';
    const result = await layer.processAsync(text, ctx());

    expect(result.text).toContain('Integration');
    expect(result.text).toContain('der nach');
    expect(result.text).toContain('published');
  });

  it('does not inherit tree-sitter parse error from inline shell snippets', async () => {
    // `my-confluent-connector` is a repo slug, not valid Java, inline
    // treatment must not crash the AST extractor.
    const text = 'Das Repo heisst `my-confluent-connector` und liegt bei Azure.';
    const result = await layer.processAsync(text, ctx());
    // either pseudonymized or left intact, but processAsync must not throw
    expect(typeof result.text).toBe('string');
  });

  it('handles multiple inline-backtick tokens and keeps the rest of the prose untouched', async () => {
    const text =
      'Der Service `OrderProcessor` ruft `ShipmentHandler` auf und emittiert ein `OrderShipped` Event.';
    const result = await layer.processAsync(text, ctx());

    expect(result.text).not.toContain('OrderProcessor');
    expect(result.text).not.toContain('ShipmentHandler');
    expect(result.text).not.toContain('OrderShipped');
    // Surrounding German prose words stay
    expect(result.text).toContain('ruft');
    expect(result.text).toContain('emittiert');
    expect(result.text).toContain('Event');
  });
});
