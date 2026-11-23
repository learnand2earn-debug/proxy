import { describe, it, expect } from 'vitest';
import { TARGET_CONFIGS, checkProxyEndpoint } from '../src/lib/checker/engine';
import { repo, DEFAULT_OWNER_ID } from '../src/lib/db/repository';
import { ProxyRecord } from '../src/types';

describe('Multi-Target Compatibility & SSL Tunneling Engine', () => {
  it('correctly defines target configurations for Web, Facebook, and LinkedIn', () => {
    expect(TARGET_CONFIGS.web).toBeDefined();
    expect(TARGET_CONFIGS.web.connectPort).toBe(443);
    expect(TARGET_CONFIGS.web.connectHost).toBe('api.ipify.org');

    expect(TARGET_CONFIGS.facebook).toBeDefined();
    expect(TARGET_CONFIGS.facebook.connectPort).toBe(443);
    expect(TARGET_CONFIGS.facebook.connectHost).toBe('m.facebook.com');
    expect(TARGET_CONFIGS.facebook.useTls).toBe(true);
    expect(TARGET_CONFIGS.facebook.acceptableStatusCodes).toContain(200);
    expect(TARGET_CONFIGS.facebook.acceptableStatusCodes).toContain(302);

    expect(TARGET_CONFIGS.linkedin).toBeDefined();
    expect(TARGET_CONFIGS.linkedin.connectPort).toBe(443);
    expect(TARGET_CONFIGS.linkedin.connectHost).toBe('www.linkedin.com');
    expect(TARGET_CONFIGS.linkedin.useTls).toBe(true);
    expect(TARGET_CONFIGS.linkedin.acceptableStatusCodes).toContain(999);
  });

  it('rejects structurally invalid endpoints immediately before network calls', async () => {
    const invalidRecord: Pick<ProxyRecord, 'normalized_endpoint' | 'protocol' | 'host' | 'port'> = {
      normalized_endpoint: 'invalid://not-a-valid-ip:999999',
      protocol: 'http',
      host: 'not-a-valid-ip',
      port: 999999
    };

    const resFb = await checkProxyEndpoint(invalidRecord, { target: 'facebook' });
    expect(resFb.status).toBe('INVALID');
    expect(resFb.target).toBe('facebook');

    const resLi = await checkProxyEndpoint(invalidRecord, { target: 'linkedin' });
    expect(resLi.status).toBe('INVALID');
    expect(resLi.target).toBe('linkedin');
  });

  it('blocks private/cloud metadata hosts under SSRF security policy', async () => {
    const internalRecord: Pick<ProxyRecord, 'normalized_endpoint' | 'protocol' | 'host' | 'port'> = {
      normalized_endpoint: 'http://169.254.169.254:80',
      protocol: 'http',
      host: '169.254.169.254',
      port: 80
    };

    const res = await checkProxyEndpoint(internalRecord, { target: 'facebook' });
    expect(res.status).toBe('INVALID');
    expect(res.error_category).toBe('SECURITY_VIOLATION');
  });

  it('correctly updates repository with target compatibility flags and tags', () => {
    const { record } = repo.insertProxy({
      owner_id: DEFAULT_OWNER_ID,
      normalized_endpoint: 'socks5://198.51.100.88:1080',
      protocol: 'socks5',
      host: '198.51.100.88',
      port: 1080,
      auth_required: false,
      current_status: 'UNKNOWN',
      tags: ['test-pool']
    });

    expect(record).toBeDefined();

    // Simulate multi-target check result
    const updateResult = repo.updateProxyCheck(record.id, {
      status: 'ACTIVE',
      latency_ms: 120,
      handshake_success: true,
      status_code: 200,
      target: 'all',
      target_compatibility: {
        web: true,
        facebook: true,
        linkedin: true
      },
      checked_at: new Date().toISOString()
    });

    expect(updateResult).toBeDefined();
    expect(updateResult?.record.current_status).toBe('ACTIVE');
    expect(updateResult?.record.target_compatibility?.facebook).toBe(true);
    expect(updateResult?.record.target_compatibility?.linkedin).toBe(true);
    expect(updateResult?.record.target_compatibility?.web).toBe(true);
    expect(updateResult?.record.tags).toContain('facebook-ready');
    expect(updateResult?.record.tags).toContain('linkedin-ready');
    expect(updateResult?.record.tags).toContain('web-ready');
  });

  it('filters proxies by target platform in repository', () => {
    // Query Facebook Ready proxies
    const fbProxies = repo.getProxies({ target: 'facebook' });
    expect(fbProxies.data.every(p => 
      p.target_compatibility?.facebook || p.tags.includes('facebook-ready')
    )).toBe(true);

    // Query LinkedIn Ready proxies
    const liProxies = repo.getProxies({ target: 'linkedin' });
    expect(liProxies.data.every(p => 
      p.target_compatibility?.linkedin || p.tags.includes('linkedin-ready')
    )).toBe(true);
  });
});

