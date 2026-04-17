import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { CodeLayer } from '../../src/pipeline/layer3-code.js';
import { BiMap } from '../../src/session/map.js';
import { getDefaults } from '../../src/config/loader.js';
import { initParser } from '../../src/ast/extractor.js';
import type { PipelineContext } from '../../src/types.js';

function makeCtx(lang: string, company?: string): PipelineContext {
  const defaults = getDefaults();
  return {
    sessionMap: new BiMap(),
    config: {
      ...defaults,
      identity: {
        ...defaults.identity,
        company: company ?? 'acme',
        domains: company ? [`${company}.com`] : [],
      },
      behavior: { ...defaults.behavior, aggression: 'high' },
      code: { ...defaults.code, language: lang, domainTerms: [], preserve: [] },
    },
  };
}

describe('Layer 3 cross-site consistency', () => {
  let layer: CodeLayer;

  beforeAll(async () => {
    await initParser();
  });

  beforeEach(() => {
    layer = new CodeLayer();
  });

  it('pseudonymizes class name consistently across declaration and self-reference', async () => {
    const ctx = makeCtx('java');
    const code = [
      'package com.acme.svc;',
      'public class Foo {',
      '  public Foo create() { return new Foo(); }',
      '}',
    ].join('\n');

    const result = await layer.processAsync(code, ctx);

    const pseudoMatch = result.text.match(/public class (\w+) \{/);
    expect(pseudoMatch).not.toBeNull();
    const pseudo = pseudoMatch![1];
    expect(pseudo).not.toBe('Foo');

    // self-references in return type and constructor call must share the pseudo
    const selfRefs = [...result.text.matchAll(/\bFoo\b/g)];
    expect(selfRefs).toHaveLength(0);
    expect(result.text).toContain(`public ${pseudo} create()`);
    expect(result.text).toContain(`return new ${pseudo}();`);
  });

  it('synchronizes PascalCase class with camelCase field sharing the same stem', async () => {
    const ctx = makeCtx('java');
    const code = [
      'public class Service {',
      '  private final FooRepository fooRepository;',
      '  public Service(FooRepository fooRepository) {',
      '    this.fooRepository = fooRepository;',
      '  }',
      '}',
    ].join('\n');

    const result = await layer.processAsync(code, ctx);

    const pascalMatch = result.text.match(/private final (\w+Repository) (\w+Repository);/);
    expect(pascalMatch).not.toBeNull();
    const pascalStem = pascalMatch![1].replace(/Repository$/, '');
    const camelStem = pascalMatch![2].replace(/Repository$/, '');

    // case-insensitive: the PascalCase and camelCase stems must refer to the
    // same underlying pseudo. i.e. "Kappa" and "kappa".
    expect(camelStem.toLowerCase()).toBe(pascalStem.toLowerCase());

    // `Foo` must not leak in any form
    expect(result.text).not.toMatch(/\bFoo\b/);
    expect(result.text).not.toMatch(/\bfoo\b/);
  });

  it('cascades class pseudonym into import statement when company package is present', async () => {
    const ctx = makeCtx('java', 'acme');
    const code = [
      'package com.acme.orders;',
      '',
      'import com.acme.shared.FooService;',
      '',
      'public class OrderHandler {',
      '  private final FooService fooService;',
      '  public OrderHandler(FooService fooService) {',
      '    this.fooService = fooService;',
      '  }',
      '}',
    ].join('\n');

    const result = await layer.processAsync(code, ctx);

    // Extract the pseudo used for FooService as the field type
    const typeMatch = result.text.match(/private final (\w+Service) (\w+Service);/);
    expect(typeMatch).not.toBeNull();
    const fieldTypePseudo = typeMatch![1];

    // The import statement must end with the same pseudo
    const importMatch = result.text.match(/^import [\w.]+\.(\w+);$/m);
    expect(importMatch).not.toBeNull();
    expect(importMatch![1]).toBe(fieldTypePseudo);

    // `FooService` must not leak anywhere
    expect(result.text).not.toContain('FooService');
  });

  it('keeps consistent pseudo when class name appears in a TypeScript default-export + reimport scenario', async () => {
    const ctx = makeCtx('typescript');
    const code = [
      "import { FooHandler } from './handlers/foo';",
      "import DefaultBar from './bar';",
      '',
      'export class OrderProcessor {',
      '  private handler = new FooHandler();',
      '  private bar = new DefaultBar();',
      '}',
    ].join('\n');

    const result = await layer.processAsync(code, ctx);

    // FooHandler: both the named-import and the usage must carry the same pseudo
    const importMatch = result.text.match(/import \{ (\w+Handler) \}/);
    const usageMatch = result.text.match(/new (\w+Handler)\(\)/);
    expect(importMatch).not.toBeNull();
    expect(usageMatch).not.toBeNull();
    expect(importMatch![1]).toBe(usageMatch![1]);

    // DefaultBar: both the import alias and the new-call must match
    const defaultMatch = result.text.match(/import (\w+) from '\.\/bar'/);
    const newMatch = result.text.match(/new (\w+)\(\)/g);
    expect(defaultMatch).not.toBeNull();
    expect(newMatch).not.toBeNull();
  });

  it('Python: class name consistent across definition and instantiation', async () => {
    const ctx = makeCtx('python');
    const code = [
      'class DataPipeline:',
      '    def run(self):',
      '        return DataPipeline()',
      '',
      'pipeline = DataPipeline()',
    ].join('\n');

    const result = await layer.processAsync(code, ctx);

    const refs = [...result.text.matchAll(/\bDataPipeline\b/g)];
    expect(refs).toHaveLength(0);

    const classMatch = result.text.match(/class (\w+):/);
    expect(classMatch).not.toBeNull();
    const pseudo = classMatch![1];
    expect(pseudo).not.toBe('DataPipeline');
    // appears exactly 3 times (class + return + module-level instantiation)
    const pseudoRefs = [...result.text.matchAll(new RegExp(`\\b${pseudo}\\b`, 'g'))];
    expect(pseudoRefs.length).toBe(3);
  });
});
