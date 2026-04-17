import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { CodeLayer } from '../../src/pipeline/layer3-code.js';
import { BiMap } from '../../src/session/map.js';
import { getDefaults } from '../../src/config/loader.js';
import { initParser } from '../../src/ast/extractor.js';
import type { PipelineContext } from '../../src/types.js';

function makeCtx(lang = 'java'): PipelineContext {
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

describe('Layer 3 edge cases (v1.2 phase 5)', () => {
  let layer: CodeLayer;

  beforeAll(async () => {
    await initParser();
  });

  beforeEach(() => {
    layer = new CodeLayer();
  });

  it('pseudonymizes type arguments inside generics: List<Subscription>', async () => {
    const ctx = makeCtx('java');
    const code = [
      'import java.util.List;',
      'public class Notifier {',
      '  private List<Subscription> subs;',
      '  public List<Subscription> findAll() { return subs; }',
      '}',
    ].join('\n');

    const result = await layer.processAsync(code, ctx);

    expect(result.text).not.toContain('Subscription');
    // List (java.util.List) is a built-in and must survive
    expect(result.text).toContain('List<');
  });

  it('preserves getter/setter method names so the JavaBean pattern keeps working', async () => {
    const ctx = makeCtx('java');
    const code = [
      'public class Subscription {',
      '  private Integer idUser;',
      '  public Integer getIdUser() { return idUser; }',
      '  public void setIdUser(Integer idUser) { this.idUser = idUser; }',
      '}',
    ].join('\n');

    const result = await layer.processAsync(code, ctx);

    // `getIdUser` and `setIdUser` must keep the get/set prefix so downstream
    // Jackson / Spring reflection still finds the property.
    expect(result.text).toMatch(/\bget\w+\(\)/);
    expect(result.text).toMatch(/\bset\w+\(/);
    // The class itself should still be pseudonymized
    expect(result.text).not.toContain('Subscription');
  });

  it('keeps the session map shared across multiple anonymize calls (prod + test file)', async () => {
    const ctx = makeCtx('java');

    const prodCode = [
      'package com.acme.svc;',
      'public class OrderService {',
      '  public Order find(String id) { return null; }',
      '}',
    ].join('\n');

    const testCode = [
      'package com.acme.svc;',
      'import org.junit.jupiter.api.Test;',
      'public class OrderServiceTest {',
      '  @Test void findsOrder() { OrderService svc = new OrderService(); }',
      '}',
    ].join('\n');

    const prodResult = await layer.processAsync(prodCode, ctx);
    const testResult = await layer.processAsync(testCode, ctx);

    const prodPseudo = ctx.sessionMap.getByOriginal('OrderService');
    const testPseudo = ctx.sessionMap.getByOriginal('OrderService');

    expect(prodPseudo).toBeDefined();
    expect(prodPseudo).toBe(testPseudo);
    expect(prodResult.text).toContain(prodPseudo!);
    expect(testResult.text).toContain(prodPseudo!);
  });

  it('does not leak PascalCase type names from method signatures', async () => {
    const ctx = makeCtx('java');
    const code = [
      'public class OrderEventHandler {',
      '  public InvoiceRecord process(OrderRequest req, CustomerProfile profile) {',
      '    return null;',
      '  }',
      '}',
    ].join('\n');

    const result = await layer.processAsync(code, ctx);

    expect(result.text).not.toContain('InvoiceRecord');
    expect(result.text).not.toContain('OrderRequest');
    expect(result.text).not.toContain('CustomerProfile');
    // OrderEventHandler has a non-structural stem (`Order`, `Event`) so it
    // gets obfuscated. A standalone `Handler` class would stay. structural
    // suffixes without any domain stem are intentionally kept readable.
    expect(result.text).not.toContain('OrderEventHandler');
  });

  it('Python: class name + type annotation + reference all use the same pseudo', async () => {
    const ctx = makeCtx('python');
    const code = [
      'class Pipeline:',
      '    def run(self) -> "Pipeline":',
      '        return Pipeline()',
    ].join('\n');

    const result = await layer.processAsync(code, ctx);

    const classMatch = result.text.match(/class (\w+):/);
    expect(classMatch).not.toBeNull();
    const pseudo = classMatch![1];
    expect(pseudo).not.toBe('Pipeline');

    expect(result.text).not.toMatch(/\bPipeline\b/);
    const pseudoCount = [...result.text.matchAll(new RegExp(`\\b${pseudo}\\b`, 'g'))].length;
    expect(pseudoCount).toBeGreaterThanOrEqual(2);
  });
});
