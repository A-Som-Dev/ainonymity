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

describe('Layer 3 prose vs code detection (code fences)', () => {
  let layer: CodeLayer;

  beforeAll(async () => {
    await initParser();
  });

  beforeEach(() => {
    layer = new CodeLayer();
  });

  it('does not pseudonymize German prose words outside fenced code', async () => {
    const ctx = makeCtx('medium');
    const text = [
      'Hi Claude, ich soll das integrieren, der nach createService ein Event publizieren kann.',
      '',
      '```java',
      'public class OrderService { public void run() {} }',
      '```',
      '',
      'Bitte mach das sauber.',
    ].join('\n');

    const result = await layer.processAsync(text, ctx);

    // Prose words stay intact
    expect(result.text).toContain('integrieren, der nach');
    expect(result.text).toContain('Bitte mach das sauber');
    // Class inside the fence gets obfuscated
    expect(result.text).not.toContain('class OrderService');
  });

  it('never puts German articles/conjunctions in the session map', async () => {
    const ctx = makeCtx('medium');
    const text = [
      'Ich soll das integrieren, der nach createService publiziert.',
      '',
      '```java',
      'public class Foo {}',
      '```',
    ].join('\n');

    await layer.processAsync(text, ctx);

    for (const prose of ['der', 'nach', 'ein', 'das', 'ich', 'soll', 'Hi', 'Bitte']) {
      expect(ctx.sessionMap.getByOriginal(prose)).toBeUndefined();
    }
  });

  it('roundtrip: null literal in code stays null after rehydrate', async () => {
    const ctx = makeCtx('medium');
    // This is the exact shape of the Kafka-mock response that broke:
    // `null` in the java block must survive anonymize → rehydrate even when
    // the prose sentence has tokens that could substring-collide (`der`).
    const prompt = [
      'Hi, ich soll das integrieren, der nach createService.',
      '',
      '```java',
      'class Foo { Object x = null; void bar() { if (y != null) return null; } }',
      '```',
    ].join('\n');

    await layer.processAsync(prompt, ctx);

    // Simulate the LLM reply which echoes `null` a few times
    const reply = 'if (ex != null) { return null; }';
    // Apply the sessionMap-driven reverse pass. rehydrate by hand because
    // the layer class doesn't own that method. The simulation: iterate pseudo
    // -> original and replace. We check that no sub-string of `null` maps to
    // a substitute. i.e. `null` cannot rehydrate to anything but itself.
    let rehydrated = reply;
    for (const [orig, pseudo] of ctx.sessionMap.entries()) {
      rehydrated = rehydrated.split(pseudo).join(orig);
    }

    expect(rehydrated).toContain('null');
    expect(rehydrated).not.toContain('derll');
  });

  it('still obfuscates identifiers referenced in prose AFTER the fence (back-reference)', async () => {
    const ctx = makeCtx('medium');
    const text = [
      '```java',
      'public class OrderService { public void run() {} }',
      '```',
      '',
      'Weiter: rufe OrderService.run() auf.',
    ].join('\n');

    const result = await layer.processAsync(text, ctx);

    expect(result.text).not.toContain('OrderService');
  });

  it('falls back to full-text AST when there are no fences (back-compat)', async () => {
    const ctx = makeCtx('medium');
    // A user pasting raw Java without markdown fences. we must still obfuscate
    // because that was the v1.2 contract before fence-awareness.
    const text = 'public class OrderService { public void run() {} }';

    const result = await layer.processAsync(text, ctx);

    expect(result.text).not.toContain('OrderService');
  });
});
