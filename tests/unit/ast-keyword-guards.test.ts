import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import {
  isLanguageKeyword,
  isFrameworkAnnotation,
  shouldPreserveIdentifier,
} from '../../src/ast/keywords.js';
import { CodeLayer } from '../../src/pipeline/layer3-code.js';
import { BiMap } from '../../src/session/map.js';
import { getDefaults } from '../../src/config/loader.js';
import { initParser } from '../../src/ast/extractor.js';
import type { PipelineContext } from '../../src/types.js';

describe('language keyword sets', () => {
  it('flags Java keywords', () => {
    expect(isLanguageKeyword('package', 'java')).toBe(true);
    expect(isLanguageKeyword('class', 'java')).toBe(true);
    expect(isLanguageKeyword('interface', 'java')).toBe(true);
    expect(isLanguageKeyword('public', 'java')).toBe(true);
    expect(isLanguageKeyword('private', 'java')).toBe(true);
    expect(isLanguageKeyword('synchronized', 'java')).toBe(true);
  });

  it('flags Kotlin keywords', () => {
    expect(isLanguageKeyword('fun', 'kotlin')).toBe(true);
    expect(isLanguageKeyword('val', 'kotlin')).toBe(true);
    expect(isLanguageKeyword('suspend', 'kotlin')).toBe(true);
    expect(isLanguageKeyword('companion', 'kotlin')).toBe(true);
  });

  it('flags Python keywords', () => {
    expect(isLanguageKeyword('def', 'python')).toBe(true);
    expect(isLanguageKeyword('lambda', 'python')).toBe(true);
    expect(isLanguageKeyword('async', 'python')).toBe(true);
    expect(isLanguageKeyword('yield', 'python')).toBe(true);
  });

  it('flags TypeScript keywords', () => {
    expect(isLanguageKeyword('function', 'typescript')).toBe(true);
    expect(isLanguageKeyword('interface', 'typescript')).toBe(true);
    expect(isLanguageKeyword('namespace', 'typescript')).toBe(true);
    expect(isLanguageKeyword('readonly', 'typescript')).toBe(true);
  });

  it('flags Go keywords', () => {
    expect(isLanguageKeyword('func', 'go')).toBe(true);
    expect(isLanguageKeyword('package', 'go')).toBe(true);
    expect(isLanguageKeyword('chan', 'go')).toBe(true);
    expect(isLanguageKeyword('select', 'go')).toBe(true);
  });

  it('flags Rust keywords', () => {
    expect(isLanguageKeyword('fn', 'rust')).toBe(true);
    expect(isLanguageKeyword('impl', 'rust')).toBe(true);
    expect(isLanguageKeyword('trait', 'rust')).toBe(true);
    expect(isLanguageKeyword('unsafe', 'rust')).toBe(true);
  });

  it('flags PHP keywords', () => {
    expect(isLanguageKeyword('namespace', 'php')).toBe(true);
    expect(isLanguageKeyword('function', 'php')).toBe(true);
    expect(isLanguageKeyword('trait', 'php')).toBe(true);
  });

  it('flags C# keywords', () => {
    expect(isLanguageKeyword('namespace', 'csharp')).toBe(true);
    expect(isLanguageKeyword('using', 'csharp')).toBe(true);
    expect(isLanguageKeyword('readonly', 'csharp')).toBe(true);
    expect(isLanguageKeyword('async', 'csharp')).toBe(true);
  });

  it('does not flag user identifiers', () => {
    expect(isLanguageKeyword('CustomerService', 'java')).toBe(false);
    expect(isLanguageKeyword('processOrder', 'java')).toBe(false);
    expect(isLanguageKeyword('datalog', 'java')).toBe(false);
  });

  it('cross-language fallback matches any keyword if lang is omitted', () => {
    expect(isLanguageKeyword('package')).toBe(true);
    expect(isLanguageKeyword('def')).toBe(true);
    expect(isLanguageKeyword('fn')).toBe(true);
  });
});

describe('framework annotations', () => {
  it('preserves Spring-Boot annotations', () => {
    expect(isFrameworkAnnotation('Service')).toBe(true);
    expect(isFrameworkAnnotation('Component')).toBe(true);
    expect(isFrameworkAnnotation('RestController')).toBe(true);
    expect(isFrameworkAnnotation('Autowired')).toBe(true);
    expect(isFrameworkAnnotation('Transactional')).toBe(true);
  });

  it('preserves JPA / Hibernate annotations', () => {
    expect(isFrameworkAnnotation('Entity')).toBe(true);
    expect(isFrameworkAnnotation('Table')).toBe(true);
    expect(isFrameworkAnnotation('Column')).toBe(true);
    expect(isFrameworkAnnotation('ManyToOne')).toBe(true);
    expect(isFrameworkAnnotation('JoinColumn')).toBe(true);
  });

  it('preserves Lombok annotations', () => {
    expect(isFrameworkAnnotation('Data')).toBe(true);
    expect(isFrameworkAnnotation('Getter')).toBe(true);
    expect(isFrameworkAnnotation('Builder')).toBe(true);
    expect(isFrameworkAnnotation('Slf4j')).toBe(true);
  });

  it('preserves Quarkus / CDI annotations', () => {
    expect(isFrameworkAnnotation('ApplicationScoped')).toBe(true);
    expect(isFrameworkAnnotation('Inject')).toBe(true);
  });

  it('preserves Angular / NestJS / .NET attributes', () => {
    expect(isFrameworkAnnotation('NgModule')).toBe(true);
    expect(isFrameworkAnnotation('Injectable')).toBe(true);
    expect(isFrameworkAnnotation('HttpGet')).toBe(true);
    expect(isFrameworkAnnotation('Route')).toBe(true);
  });

  it('preserves React hook names (use-prefix)', () => {
    expect(isFrameworkAnnotation('useState')).toBe(true);
    expect(isFrameworkAnnotation('useEffect')).toBe(true);
    expect(isFrameworkAnnotation('useMemo')).toBe(true);
  });

  it('does not preserve plain use* words', () => {
    expect(isFrameworkAnnotation('use')).toBe(false);
    expect(isFrameworkAnnotation('user')).toBe(false);
    expect(isFrameworkAnnotation('useful')).toBe(false);
  });

  it('does not preserve user identifiers that only look like annotations', () => {
    expect(isFrameworkAnnotation('CustomerService')).toBe(false);
    expect(isFrameworkAnnotation('ProjectRepository')).toBe(false);
  });
});

describe('shouldPreserveIdentifier composite guard', () => {
  it('combines keyword + framework checks', () => {
    expect(shouldPreserveIdentifier('package', 'java')).toBe(true);
    expect(shouldPreserveIdentifier('Service', 'java')).toBe(true);
    expect(shouldPreserveIdentifier('useState', 'typescript')).toBe(true);
    expect(shouldPreserveIdentifier('ReportHubService', 'java')).toBe(false);
  });
});

describe('CodeLayer keyword preservation (Phase 1 bug repro)', () => {
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
        behavior: {
          ...getDefaults().behavior,
          aggression: 'high',
        },
        code: {
          ...getDefaults().code,
          language: 'java',
          domainTerms: [],
          preserve: [],
        },
      },
    };
  });

  it('leaves Java `package` keyword untouched when aggression=high', async () => {
    const code = [
      'package com.acme.orders;',
      '',
      'public class PackageManager {',
      '  private String packageInfo;',
      '  public String getPackageInfo() { return packageInfo; }',
      '}',
    ].join('\n');

    const result = await layer.processAsync(code, ctx);

    expect(result.text).toMatch(/^package com\./m);
    expect(result.text).not.toContain('Psi com.acme');
  });

  it('does not register language keywords as SessionMap keys', async () => {
    const code = [
      'package com.acme.orders;',
      'public class PackageManager {',
      '  private String packageInfo;',
      '}',
    ].join('\n');

    await layer.processAsync(code, ctx);

    expect(ctx.sessionMap.getByOriginal('package')).toBeUndefined();
    expect(ctx.sessionMap.getByOriginal('class')).toBeUndefined();
    expect(ctx.sessionMap.getByOriginal('public')).toBeUndefined();
  });

  it('ignores a poisoned SessionMap entry for a keyword on subsequent requests', async () => {
    ctx.sessionMap.set('package', 'Psi', 'code', 'domain-term');

    const code = 'package com.acme.orders;\npublic class Foo {}';
    const result = await layer.processAsync(code, ctx);

    expect(result.text).toMatch(/^package com\./m);
    expect(result.text).not.toMatch(/^Psi com\./m);
  });

  it('preserves Spring-Boot annotations in high mode', async () => {
    const code = [
      'package com.acme.orders;',
      '',
      'import org.springframework.stereotype.Service;',
      'import org.springframework.beans.factory.annotation.Autowired;',
      '',
      '@Service',
      'public class OrderProcessingService {',
      '  @Autowired',
      '  private OrderRepository repository;',
      '}',
    ].join('\n');

    const result = await layer.processAsync(code, ctx);

    expect(result.text).toContain('@Service');
    expect(result.text).toContain('@Autowired');
  });

  it('preserves React hook names in TypeScript high mode', async () => {
    ctx.config.code.language = 'typescript';
    const code = [
      "import { useState, useEffect } from 'react';",
      'export function CustomerDashboard() {',
      '  const [count, setCount] = useState(0);',
      '  useEffect(() => {}, []);',
      '  return count;',
      '}',
    ].join('\n');

    const result = await layer.processAsync(code, ctx);

    expect(result.text).toContain('useState');
    expect(result.text).toContain('useEffect');
  });
});
