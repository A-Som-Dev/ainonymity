import { describe, it, expect } from 'vitest';
import { matchSecrets } from '../../src/patterns/secrets.js';

describe('Sensitive filesystem path patterns', () => {
  it('matches keystore/truststore JKS paths', () => {
    const text = 'Truststore: /opt/truststore/acme-ca.jks';
    const hits = matchSecrets(text);
    expect(hits.some((h) => h.match.includes('/opt/truststore/acme-ca.jks'))).toBe(true);
  });

  it('matches PEM / KEY / CRT / P12 paths', () => {
    for (const path of [
      '/etc/ssl/private/server.key',
      '/opt/certs/corp.pem',
      '/var/certs/client.crt',
      '/opt/certs/bundle.p12',
    ]) {
      const hits = matchSecrets(`load ${path}`);
      expect(hits.some((h) => h.match.includes(path)), `should match ${path}`).toBe(true);
    }
  });

  it('does not match generic log / bin / tmp paths', () => {
    const text = '/var/log/app.log  /usr/bin/node  /tmp/scratch';
    const hits = matchSecrets(text);
    const joined = hits.map((h) => h.match).join(' ');
    expect(joined).not.toContain('/var/log');
    expect(joined).not.toContain('/usr/bin');
    expect(joined).not.toContain('/tmp');
  });
});
