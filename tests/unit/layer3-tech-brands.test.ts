import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { CodeLayer } from '../../src/pipeline/layer3-code.js';
import { BiMap } from '../../src/session/map.js';
import { getDefaults } from '../../src/config/loader.js';
import { initParser } from '../../src/ast/extractor.js';
import { isFrameworkAnnotation } from '../../src/ast/keywords.js';
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

describe('Public tech-brand whitelist', () => {
  it('treats bare Kafka and friends as framework annotations', () => {
    for (const brand of [
      'Kafka', 'Spring', 'SpringBoot',
      'Quarkus', 'Redis', 'Postgres', 'Postgresql', 'Oracle',
      'MongoDB', 'RabbitMQ', 'Elasticsearch', 'Docker', 'Kubernetes',
      'Helm', 'Maven', 'Gradle', 'Jackson', 'Hibernate',
      'Jenkins', 'GitLab', 'GitHub', 'Jira', 'Confluence',
      'Terraform', 'Ansible', 'Vault',
    ]) {
      expect(isFrameworkAnnotation(brand)).toBe(true);
    }
  });

  it('does not accidentally match user identifiers that merely start with a brand', () => {
    // Ensure the whitelist uses set-membership, not prefix-match.
    for (const userId of ['AcmeKafkaHelper', 'CustomOracleClient']) {
      expect(isFrameworkAnnotation(userId)).toBe(false);
    }
  });
});

describe('HTTP verbs as structural prefixes', () => {
  let layer: CodeLayer;

  beforeAll(async () => {
    await initParser();
  });

  beforeEach(() => {
    layer = new CodeLayer();
  });

  it('preserves HTTP-verb prefixes in method names (medium mode)', async () => {
    const ctx = makeCtx('java');
    const code = [
      'public class Api {',
      '  public void getFoo() {}',
      '  public void postFoo() {}',
      '  public void putFoo() {}',
      '  public void patchFoo() {}',
      '  public void deleteFoo() {}',
      '  public void headFoo() {}',
      '  public void optionsFoo() {}',
      '}',
    ].join('\n');

    const result = await layer.processAsync(code, ctx);

    for (const verb of ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']) {
      // verb prefix must survive in some `verbSomething(` form. even if
      // the suffix is pseudonymized, the verb token itself is preserved.
      expect(result.text).toMatch(new RegExp(`\\b${verb}[A-Z]\\w*\\(`));
    }
  });

  it('keeps Kafka-related identifiers inside code intact in medium mode', async () => {
    const ctx = makeCtx('java');
    const code = [
      'package com.acme.kafka;',
      '',
      'import org.springframework.kafka.core.KafkaTemplate;',
      'import org.springframework.kafka.annotation.KafkaListener;',
      '',
      'public class OrderProducer {',
      '  private final KafkaTemplate<String, Object> kafkaTemplate;',
      '  public OrderProducer(KafkaTemplate<String, Object> kafkaTemplate) {',
      '    this.kafkaTemplate = kafkaTemplate;',
      '  }',
      '}',
    ].join('\n');

    const result = await layer.processAsync(code, ctx);

    // The Kafka prefix must survive. the LLM needs to keep the Apache-Kafka
    // mental model. Template/Listener suffixes may or may not get obfuscated,
    // which is acceptable because they are generic (any Spring module has
    // `*Template`/`*Listener`). What matters is that the brand root is visible.
    expect(result.text).toMatch(/\bKafka[A-Z]\w*/);
    // User class still gets obfuscated
    expect(result.text).not.toContain('class OrderProducer');
  });
});
