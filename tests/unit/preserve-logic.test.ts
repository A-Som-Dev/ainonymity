import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { CodeLayer } from '../../src/pipeline/layer3-code.js';
import { BiMap } from '../../src/session/map.js';
import { getDefaults } from '../../src/config/loader.js';
import type { PipelineContext } from '../../src/types.js';
import { initParser } from '../../src/ast/extractor.js';

describe('code.preserve. all replacement paths', () => {
  let layer: CodeLayer;
  let ctx: PipelineContext;

  beforeAll(async () => {
    await initParser();
  });

  beforeEach(() => {
    layer = new CodeLayer();
    ctx = {
      sessionMap: new BiMap(),
      config: {
        ...getDefaults(),
        code: {
          ...getDefaults().code,
          language: 'java',
          domainTerms: [],
          preserve: [],
        },
      },
    };
  });

  it('preserves a full identifier intercepted by the AST extractor', async () => {
    ctx.config.code.preserve = ['MyKeeper'];
    const code = 'public class MyKeeper {}';
    const result = await layer.processAsync(code, ctx);
    expect(result.text).toContain('MyKeeper');
  });

  it('preserves a compound identifier whose substring is a domain_term', async () => {
    // This is the real-world ReportHub case: user adds a class to preserve,
    // but a related domain_term is also configured. The compound-domain-term
    // pass must not override preserve.
    ctx.config.code.domainTerms = ['Network'];
    ctx.config.code.preserve = ['NetworkManager'];
    const code = 'public class NetworkManager { void foo() {} }';
    const result = await layer.processAsync(code, ctx);
    expect(result.text).toContain('NetworkManager');
  });

  it('does not pseudonymize two preserved siblings sharing a domain_term', async () => {
    ctx.config.code.domainTerms = ['Network'];
    ctx.config.code.preserve = ['NetworkManager', 'NetworkConfig'];
    const code = 'public class NetworkManager { NetworkConfig cfg; }';
    const result = await layer.processAsync(code, ctx);
    expect(result.text).toContain('NetworkManager');
    expect(result.text).toContain('NetworkConfig');
  });

  it('honors preserve when a prior session already mapped the identifier', async () => {
    // Cross-request scenario: a previous request pseudonymized MyService before
    // the user added it to preserve. The next request must honor preserve and
    // drop the stale session-map entry for that identifier.
    ctx.config.code.preserve = ['MyService'];
    ctx.sessionMap.set('MyService', 'AlphaStored', 'code', 'identifier');
    const code = 'public class MyService { void run() {} }';
    const result = await layer.processAsync(code, ctx);
    expect(result.text).toContain('MyService');
    expect(result.text).not.toContain('AlphaStored');
  });

  it('preserve wins over a domain_term with the same name', async () => {
    // Edge case: the user lists a term both as domain_term and as preserve.
    // Preserve is the explicit opt-out and must take precedence.
    ctx.config.code.domainTerms = ['Customer'];
    ctx.config.code.preserve = ['Customer'];
    const code = 'public class Order { String Customer = "x"; }';
    const result = await layer.processAsync(code, ctx);
    expect(result.text).toContain('Customer');
  });

  it('still pseudonymizes non-preserved compounds that contain the domain_term', async () => {
    // Regression guard: preserve must not accidentally whitelist everything.
    ctx.config.code.domainTerms = ['Network'];
    ctx.config.code.preserve = ['NetworkManager'];
    const code = 'public class NetworkOther { NetworkManager m; }';
    const result = await layer.processAsync(code, ctx);
    expect(result.text).toContain('NetworkManager');
    expect(result.text).not.toContain('NetworkOther');
  });
});
