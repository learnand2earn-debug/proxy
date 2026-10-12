import { describe, it, expect, beforeEach } from 'vitest';
import { repo, DEFAULT_OWNER_ID } from '../src/lib/db/repository';
import { ProxyCheckResult, ProxyRecord } from '../src/types';

describe('Monitoring & State Transition Engine', () => {
  let testProxy: ProxyRecord;

  beforeEach(() => {
    // Insert a fresh test proxy
    const uniqueEndpoint = `socks5://198.51.100.${Math.floor(Math.random() * 200 + 10)}:1080`;
    const { record } = repo.insertProxy({
      owner_id: DEFAULT_OWNER_ID,
      normalized_endpoint: uniqueEndpoint,
      protocol: 'socks5',
      host: '198.51.100.15',
      port: 1080,
      auth_required: false,
      current_status: 'UNKNOWN',
      check_interval_seconds: 300,
      tags: ['unit-test']
    });
    testProxy = record;
  });

  it('retains proxy record when marked INACTIVE and stores failure reason', () => {
    const inactiveResult: ProxyCheckResult = {
      status: 'INACTIVE',
      latency_ms: 6000,
      handshake_success: false,
      error_category: 'TIMEOUT',
      error_message: 'Timed out waiting for connection',
      checked_at: new Date().toISOString()
    };

    const updated = repo.updateProxyCheck(testProxy.id, inactiveResult);
    expect(updated).not.toBeNull();
    expect(updated!.record.current_status).toBe('INACTIVE');
    expect(updated!.record.consecutive_failures).toBe(1);
    expect(updated!.record.last_failure_category).toBe('TIMEOUT');

    // Proxy must still exist in inventory
    const retrieved = repo.getProxyById(testProxy.id);
    expect(retrieved).toBeDefined();
    expect(retrieved!.current_status).toBe('INACTIVE');
  });

  it('detects an INACTIVE to ACTIVE transition and records recovery event', () => {
    // 1. Mark as INACTIVE
    repo.updateProxyCheck(testProxy.id, {
      status: 'INACTIVE',
      latency_ms: 5000,
      handshake_success: false,
      error_category: 'TIMEOUT',
      error_message: 'Refused',
      checked_at: new Date().toISOString()
    });

    // 2. Mark as ACTIVE (simulating health recovery)
    const activeResult: ProxyCheckResult = {
      status: 'ACTIVE',
      latency_ms: 88,
      handshake_success: true,
      status_code: 200,
      checked_at: new Date().toISOString()
    };

    const updateRes = repo.updateProxyCheck(testProxy.id, activeResult);
    expect(updateRes).not.toBeNull();
    expect(updateRes!.transition).toBeDefined();
    expect(updateRes!.transition!.from_status).toBe('INACTIVE');
    expect(updateRes!.transition!.to_status).toBe('ACTIVE');
    expect(updateRes!.record.recovery_count).toBeGreaterThan(0);
    expect(updateRes!.record.consecutive_failures).toBe(0);

    // Verify recovery notification was added
    const notifs = repo.getNotifications();
    const recoveryNotif = notifs.find(n => n.proxy_id === testProxy.id && n.type === 'proxy_recovered');
    expect(recoveryNotif).toBeDefined();
  });

  it('does NOT create duplicate transition alerts when status remains ACTIVE', () => {
    // First active check
    repo.updateProxyCheck(testProxy.id, {
      status: 'ACTIVE',
      latency_ms: 100,
      handshake_success: true,
      checked_at: new Date().toISOString()
    });

    // Second active check (status unchanged)
    const secondCheck = repo.updateProxyCheck(testProxy.id, {
      status: 'ACTIVE',
      latency_ms: 105,
      handshake_success: true,
      checked_at: new Date().toISOString()
    });

    expect(secondCheck!.transition).toBeUndefined();
  });

  it('calculates bounded exponential backoff interval for inactive proxies', () => {
    const proxyMock: ProxyRecord = {
      ...testProxy,
      current_status: 'INACTIVE',
      consecutive_failures: 4,
      check_interval_seconds: 300
    };

    const nextInterval = repo.calculateNextInterval(proxyMock);
    // Base 300 * 1.5^4 ~= 1518s (within bounded range and jitter)
    expect(nextInterval).toBeGreaterThan(300);
    expect(nextInterval).toBeLessThanOrEqual(86400); // Capped at 24h
  });

  it('automatically quarantines records that exceed consecutive failure threshold', () => {
    // Set auto-quarantine threshold to 3
    repo.updateSettings(DEFAULT_OWNER_ID, {
      auto_quarantine_enabled: true,
      quarantine_threshold_failures: 3
    });

    // Simulate 3 failures
    for (let i = 0; i < 3; i++) {
      repo.updateProxyCheck(testProxy.id, {
        status: 'INACTIVE',
        latency_ms: 5000,
        handshake_success: false,
        error_category: 'CONNECTION_REFUSED',
        error_message: 'Port closed',
        checked_at: new Date().toISOString()
      });
    }

    const quarantined = repo.getProxyById(testProxy.id);
    expect(quarantined!.is_quarantined).toBe(true);
    expect(quarantined!.quarantine_reason).toContain('consecutive failure');
  });

  it('restores quarantined proxy when operator requests restoration', () => {
    repo.quarantineProxy(testProxy.id, 'Manual quarantine test');
    expect(repo.getProxyById(testProxy.id)!.is_quarantined).toBe(true);

    const restored = repo.restoreProxy(testProxy.id);
    expect(restored).not.toBeNull();
    expect(restored!.is_quarantined).toBe(false);
    expect(restored!.current_status).toBe('UNKNOWN');
  });

  it('deduplicates identical proxy endpoints for the same owner', () => {
    const randomPort = Math.floor(Math.random() * 30000 + 10000);
    const ep = `socks5://198.51.100.99:${randomPort}`;
    const first = repo.insertProxy({
      owner_id: DEFAULT_OWNER_ID,
      normalized_endpoint: ep,
      protocol: 'socks5',
      host: '198.51.100.99',
      port: 9999,
      auth_required: false,
      current_status: 'UNKNOWN',
      check_interval_seconds: 900,
      tags: []
    });
    expect(first.is_duplicate).toBe(false);

    const second = repo.insertProxy({
      owner_id: DEFAULT_OWNER_ID,
      normalized_endpoint: ep,
      protocol: 'socks5',
      host: '198.51.100.99',
      port: 9999,
      auth_required: false,
      current_status: 'UNKNOWN',
      check_interval_seconds: 900,
      tags: []
    });
    expect(second.is_duplicate).toBe(true);
    expect(second.record.id).toBe(first.record.id);
  });
});
