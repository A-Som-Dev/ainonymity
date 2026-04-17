import { describe, it, expect } from 'vitest';
import { decodeWithBom } from '../../src/shared.js';

describe('decodeWithBom', () => {
  it('reads plain utf-8 without BOM as-is', () => {
    const buf = Buffer.from('hello world', 'utf8');
    expect(decodeWithBom(buf)).toBe('hello world');
  });

  it('strips the UTF-8 BOM and decodes the rest', () => {
    const body = Buffer.from('contact: artur', 'utf8');
    const buf = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), body]);
    expect(decodeWithBom(buf)).toBe('contact: artur');
  });

  it('decodes UTF-16 LE with BOM (windows excel export)', () => {
    const body = Buffer.from('certifi~=2024.2.2', 'utf16le');
    const buf = Buffer.concat([Buffer.from([0xff, 0xfe]), body]);
    const out = decodeWithBom(buf);
    expect(out).toBe('certifi~=2024.2.2');
  });

  it('decodes UTF-16 BE with BOM', () => {
    const le = Buffer.from('contact: artur', 'utf16le');
    const be = Buffer.from(le);
    be.swap16();
    const buf = Buffer.concat([Buffer.from([0xfe, 0xff]), be]);
    expect(decodeWithBom(buf)).toBe('contact: artur');
  });

  it('handles empty buffer without throwing', () => {
    expect(decodeWithBom(Buffer.alloc(0))).toBe('');
  });
});
