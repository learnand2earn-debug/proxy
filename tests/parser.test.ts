import { describe, it, expect } from 'vitest';
import { parseProxyString, parseBulkProxyList, maskEndpoint } from '../src/lib/validation/parser';

describe('Proxy Parser & Normalization Engine', () => {
  it('correctly parses standard host:port with default protocol', () => {
    const res = parseProxyString('198.51.100.10:8080', 'http');
    expect(res.is_valid).toBe(true);
    expect(res.host).toBe('198.51.100.10');
    expect(res.port).toBe(8080);
    expect(res.protocol).toBe('http');
    expect(res.normalized_endpoint).toBe('http://198.51.100.10:8080');
  });

  it('correctly parses explicit protocol URLs for SOCKS5 and HTTPS', () => {
    const socks = parseProxyString('socks5://proxy.example.com:1080');
    expect(socks.is_valid).toBe(true);
    expect(socks.protocol).toBe('socks5');
    expect(socks.host).toBe('proxy.example.com');
    expect(socks.port).toBe(1080);

    const https = parseProxyString('https://secure-proxy.internal.net:8443');
    expect(https.is_valid).toBe(true);
    expect(https.protocol).toBe('https');
    expect(https.port).toBe(8443);
  });

  it('parses authentication credentials in user:pass@host:port format', () => {
    const res = parseProxyString('socks5://operator:secretPassword99@198.51.100.20:1080');
    expect(res.is_valid).toBe(true);
    expect(res.username).toBe('operator');
    expect(res.password).toBe('secretPassword99');
    expect(res.normalized_endpoint).toBe('socks5://operator:secretPassword99@198.51.100.20:1080');
  });

  it('parses 4-part host:port:user:pass proxy list format', () => {
    const res = parseProxyString('198.51.100.30:3128:adminUser:pass123', 'http');
    expect(res.is_valid).toBe(true);
    expect(res.host).toBe('198.51.100.30');
    expect(res.port).toBe(3128);
    expect(res.username).toBe('adminUser');
    expect(res.password).toBe('pass123');
  });

  it('rejects invalid ports exceeding 65535 or below 1', () => {
    const highPort = parseProxyString('198.51.100.1:70000');
    expect(highPort.is_valid).toBe(false);
    expect(highPort.validation_error).toContain('Port must be between 1 and 65535');

    const zeroPort = parseProxyString('198.51.100.1:0');
    expect(zeroPort.is_valid).toBe(false);
  });

  it('rejects malformed hosts and missing ports', () => {
    const noPort = parseProxyString('just-a-hostname-without-port');
    expect(noPort.is_valid).toBe(false);

    const badHost = parseProxyString('invalid..host..:8080');
    expect(badHost.is_valid).toBe(false);
  });

  it('masks sensitive credentials properly', () => {
    const masked = maskEndpoint('socks5://operator:superSecretToken@198.51.100.20:1080');
    expect(masked).toBe('socks5://operator:••••••@198.51.100.20:1080');
    expect(masked).not.toContain('superSecretToken');
  });

  it('bulk parses mixed CSV, JSON and line-by-line inputs', () => {
    const bulkRaw = `
      198.51.100.1:1080
      # Comment line
      socks5://user:pass@198.51.100.2:1080
      malformed-line-here
      198.51.100.3,8080,http,csvuser,csvpass
    `;

    const { valid, invalid } = parseBulkProxyList(bulkRaw, 'socks5');
    expect(valid.length).toBe(3);
    expect(invalid.length).toBe(1);
    expect(invalid[0].validation_error).toBeDefined();
  });
});
