import { describe, it, expect } from 'vitest';
import { matchSecrets } from '../../src/patterns/secrets.js';

describe('SASL-JAAS block redaction', () => {
  it('redacts the username inside a PlainLoginModule JAAS block', () => {
    const text =
      'sasl.jaas.config: \'org.apache.kafka.common.security.plain.PlainLoginModule required username="svc_user_1" password="secret_1";\'';
    const hits = matchSecrets(text);
    const matches = hits.map((h) => h.match);
    expect(matches.some((m) => m.includes('svc_user_1'))).toBe(true);
  });

  it('redacts SCRAM-SHA-256 JAAS block too', () => {
    const text =
      'sasl.jaas.config=org.apache.kafka.common.security.scram.ScramLoginModule required username="svc_user_2" password="secret_2";';
    const hits = matchSecrets(text);
    expect(hits.some((h) => h.match.includes('svc_user_2'))).toBe(true);
  });

  it('does not swallow unrelated text on the same line', () => {
    // Only the JAAS block itself gets captured. surrounding YAML keys stay.
    const text =
      'config:\n  sasl.jaas.config: \'org.apache.kafka.common.security.plain.PlainLoginModule required username="a" password="b";\'\n  name: myapp';
    const hits = matchSecrets(text);
    const joined = hits.map((h) => h.match).join('\n');
    expect(joined).not.toContain('name: myapp');
  });
});
