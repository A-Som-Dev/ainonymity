import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { CodeLayer } from '../../src/pipeline/layer3-code.js';
import { BiMap } from '../../src/session/map.js';
import { getDefaults } from '../../src/config/loader.js';
import { initParser } from '../../src/ast/extractor.js';
import type { PipelineContext, AggressionMode } from '../../src/types.js';

function makeCtx(aggression: AggressionMode, lang = 'java'): PipelineContext {
  const defaults = getDefaults();
  return {
    sessionMap: new BiMap(),
    config: {
      ...defaults,
      identity: { ...defaults.identity, company: 'acme', domains: ['acme.com'] },
      behavior: { ...defaults.behavior, aggression },
      code: { ...defaults.code, language: lang, domainTerms: [], preserve: [] },
    },
  };
}

describe('Layer 3 comment-scan (high mode)', () => {
  let layer: CodeLayer;

  beforeAll(async () => {
    await initParser();
  });

  beforeEach(() => {
    layer = new CodeLayer();
  });

  it('rewrites class names mentioned in line comments in high mode', async () => {
    const ctx = makeCtx('high');
    const code = [
      'package com.acme.orders;',
      '',
      'public class OrderProcessor {',
      '  // TODO: fix bug in OrderProcessor when shipping is null',
      '  public void run() {}',
      '}',
    ].join('\n');

    const result = await layer.processAsync(code, ctx);

    expect(result.text).not.toContain('OrderProcessor');
  });

  it('rewrites class names in block comments in high mode', async () => {
    const ctx = makeCtx('high');
    const code = [
      'package com.acme.orders;',
      '',
      '/**',
      ' * Handles routing for OrderProcessor instances.',
      ' * Replaces the legacy OrderProcessor implementation.',
      ' */',
      'public class OrderProcessor {',
      '  public void run() {}',
      '}',
    ].join('\n');

    const result = await layer.processAsync(code, ctx);

    expect(result.text).not.toContain('OrderProcessor');
  });

  it('also rewrites comment mentions of known identifiers in medium mode', async () => {
    // Medium does not have a dedicated comment scanner, but once a class is
    // registered in the session map, applyReplacementMap rewrites every
    // word-boundary occurrence. including the one inside a comment. That's
    // the right thing to do; low mode is the opt-out.
    const ctx = makeCtx('medium');
    const code = [
      'package com.acme.orders;',
      '',
      '// OrderProcessor is used below',
      'public class OrderProcessor {',
      '  public void run() {}',
      '}',
    ].join('\n');

    const result = await layer.processAsync(code, ctx);

    expect(result.text).not.toContain('OrderProcessor');
  });

  it('leaves comments untouched in low mode (no AST extraction, no map entry)', async () => {
    const ctx = makeCtx('low');
    const code = [
      '// OrderProcessor is used below',
      'public class OrderProcessor {',
      '  public void run() {}',
      '}',
    ].join('\n');

    const result = await layer.processAsync(code, ctx);

    expect(result.text).toContain('OrderProcessor');
  });

  it('does not rewrite PascalCase words that are not in the session map', async () => {
    const ctx = makeCtx('high');
    const code = [
      '// This class implements a Singleton pattern for thread safety',
      'public class OrderProcessor {',
      '  public void run() {}',
      '}',
    ].join('\n');

    const result = await layer.processAsync(code, ctx);

    // Singleton is never declared so it is never mapped; it should survive
    expect(result.text).toContain('Singleton');
  });

  it('Python: rewrites class names in # comments and docstrings in high mode', async () => {
    const ctx = makeCtx('high', 'python');
    const code = [
      'class DataPipeline:',
      '    """DataPipeline orchestrates ingestion."""',
      '    # DataPipeline is called per-batch',
      '    def run(self):',
      '        pass',
    ].join('\n');

    const result = await layer.processAsync(code, ctx);

    expect(result.text).not.toContain('DataPipeline');
  });
});
