import { describe, it, expect } from 'vitest';
import { matchSecrets } from '../../src/patterns/secrets.js';

describe('K8s secretKeyRef + cloud secret paths', () => {
  it('matches Kubernetes secretKeyRef name references', () => {
    const text = `
env:
  - name: DB_PASSWORD
    valueFrom:
      secretKeyRef:
        name: prod-db-credentials
        key: postgres-password
`;
    const hits = matchSecrets(text);
    const matches = hits.map((h) => h.match);
    expect(matches.some((m) => m.includes('prod-db-credentials'))).toBe(true);
  });

  it('matches AWS SSM Parameter Store paths', () => {
    const text = 'export PW=$(aws ssm get-parameter --name /prod/acme/app/kafka/sasl/password --with-decryption)';
    const hits = matchSecrets(text);
    expect(hits.some((h) => h.match.includes('/prod/acme/app/kafka/sasl/password'))).toBe(true);
  });

  it('matches Azure KeyVault secret references', () => {
    const text = 'Secret is stored at https://corp-vault.vault.azure.net/secrets/db-password';
    const hits = matchSecrets(text);
    expect(
      hits.some((h) => h.match.includes('corp-vault.vault.azure.net') || h.match.includes('secrets/db-password')),
    ).toBe(true);
  });

  it('matches HashiCorp Vault paths', () => {
    const text = 'vault kv get secret/prod/acme/db-password';
    const hits = matchSecrets(text);
    expect(hits.some((h) => h.match.includes('secret/prod/acme/db-password'))).toBe(true);
  });

  it('does not match generic file paths', () => {
    const text = '/var/log/app.log and /usr/local/bin/something';
    const hits = matchSecrets(text);
    const combined = hits.map((h) => h.match).join(' ');
    expect(combined).not.toContain('/var/log');
    expect(combined).not.toContain('/usr/local');
  });
});
