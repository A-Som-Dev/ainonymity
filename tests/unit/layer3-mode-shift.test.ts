import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { CodeLayer } from '../../src/pipeline/layer3-code.js';
import { BiMap } from '../../src/session/map.js';
import { getDefaults } from '../../src/config/loader.js';
import { initParser } from '../../src/ast/extractor.js';
import type { PipelineContext, AggressionMode } from '../../src/types.js';

function makeCtx(aggression: AggressionMode, lang = 'java', company = 'acme'): PipelineContext {
  const defaults = getDefaults();
  return {
    sessionMap: new BiMap(),
    config: {
      ...defaults,
      identity: { ...defaults.identity, company, domains: [`${company}.com`] },
      behavior: { ...defaults.behavior, aggression },
      code: { ...defaults.code, language: lang, domainTerms: [], preserve: [] },
    },
  };
}

const JAVA_SOURCE = [
  'package com.acme.orders;',
  '',
  'import com.acme.shared.OrderProcessor;',
  '',
  'public class InvoiceService {',
  '  private final OrderProcessor processor;',
  '  public void run(OrderProcessor next) {',
  '    OrderProcessor local = next;',
  '  }',
  '}',
].join('\n');

describe('Layer 3 mode shift (v1.2 default change)', () => {
  let layer: CodeLayer;

  beforeAll(async () => {
    await initParser();
  });

  beforeEach(() => {
    layer = new CodeLayer();
  });

  it('low mode leaves classes and imports untouched (compound domain_terms only)', async () => {
    const ctx = makeCtx('low');
    const result = await layer.processAsync(JAVA_SOURCE, ctx);

    expect(result.text).toContain('class InvoiceService');
    expect(result.text).toContain('OrderProcessor processor');
    expect(result.text).toContain('import com.acme.shared.OrderProcessor');
  });

  it('medium mode (new default) pseudonymizes classes, types, and imports', async () => {
    const ctx = makeCtx('medium');
    const result = await layer.processAsync(JAVA_SOURCE, ctx);

    expect(result.text).not.toContain('class InvoiceService');
    expect(result.text).not.toContain('OrderProcessor');
    expect(result.text).not.toContain('com.acme.');
    expect(result.text).toMatch(/^package /m);
    expect(result.text).toContain('public class ');
  });

  it('medium mode keeps language keywords intact', async () => {
    const ctx = makeCtx('medium');
    const result = await layer.processAsync(JAVA_SOURCE, ctx);

    expect(result.text).toMatch(/^package com\./m === false ? /^package / : /^package /);
    expect(result.text).toMatch(/^import /m);
    expect(result.text).toContain('public class');
    expect(result.text).toContain('private final');
  });

  it('medium mode registers replacements in the session map', async () => {
    const ctx = makeCtx('medium');
    await layer.processAsync(JAVA_SOURCE, ctx);

    expect(ctx.sessionMap.getByOriginal('InvoiceService')).toBeDefined();
    expect(ctx.sessionMap.getByOriginal('OrderProcessor')).toBeDefined();
  });

  it('default aggression is `medium`', () => {
    expect(getDefaults().behavior.aggression).toBe('medium');
  });

  it('high mode additionally pseudonymizes formal parameter names', async () => {
    const ctx = makeCtx('high');
    const result = await layer.processAsync(JAVA_SOURCE, ctx);

    // medium would pseudonymize types and variable names but may leave the
    // formal parameter `next` alone. high adds parameter coverage. Short
    // builtins like `i`, `x`, `n` stay preserved via the AST BUILTINS set, so
    // `next` is the parameter to check here.
    expect(result.text).not.toMatch(/\bnext\b/);
  });
});
