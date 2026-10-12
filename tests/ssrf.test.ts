import { describe, it, expect } from 'vitest';
import { isPrivateIPv4, isPrivateIPv6, validateEndpointSecurity } from '../src/lib/security/ssrf';

describe('SSRF Protection & Address Sanitization', () => {
  it('identifies RFC 1918 IPv4 private networks', () => {
    expect(isPrivateIPv4('10.0.0.1')).toBe(true);
    expect(isPrivateIPv4('10.254.12.3')).toBe(true);
    expect(isPrivateIPv4('172.16.0.1')).toBe(true);
    expect(isPrivateIPv4('172.31.255.255')).toBe(true);
    expect(isPrivateIPv4('192.168.1.1')).toBe(true);
    expect(isPrivateIPv4('192.168.100.254')).toBe(true);
  });

  it('identifies loopback, link-local, and cloud metadata IPs', () => {
    expect(isPrivateIPv4('127.0.0.1')).toBe(true);
    expect(isPrivateIPv4('127.1.2.3')).toBe(true);
    expect(isPrivateIPv4('169.254.169.254')).toBe(true); // AWS / GCP Metadata IP
    expect(isPrivateIPv4('0.0.0.0')).toBe(true);
  });

  it('allows public IPv4 addresses', () => {
    expect(isPrivateIPv4('8.8.8.8')).toBe(false);
    expect(isPrivateIPv4('1.1.1.1')).toBe(false);
    expect(isPrivateIPv4('142.250.190.46')).toBe(false);
  });

  it('identifies IPv6 loopback and unique local addresses', () => {
    expect(isPrivateIPv6('::1')).toBe(true);
    expect(isPrivateIPv6('fc00::1')).toBe(true);
    expect(isPrivateIPv6('fe80::1')).toBe(true);
    expect(isPrivateIPv6('2606:4700:4700::1111')).toBe(false); // Cloudflare public IPv6
  });

  it('rejects forbidden hostnames and metadata endpoints in validateEndpointSecurity', async () => {
    const resLocalhost = await validateEndpointSecurity('localhost', false);
    expect(resLocalhost.isSafe).toBe(false);

    const resMeta = await validateEndpointSecurity('169.254.169.254', false);
    expect(resMeta.isSafe).toBe(false);
    expect(resMeta.error).toContain('SSRF');

    const resPrivate = await validateEndpointSecurity('192.168.1.50', false);
    expect(resPrivate.isSafe).toBe(false);
    expect(resPrivate.error).toContain('private or restricted');
  });

  it('permits internal addresses when allowInternal is explicitly granted by operator', async () => {
    const resAllowed = await validateEndpointSecurity('192.168.1.50', true);
    expect(resAllowed.isSafe).toBe(true);
  });
});
