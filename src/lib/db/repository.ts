import fs from 'fs';
import path from 'path';
import { 
  ProxyRecord, 
  ProxySource, 
  ProxyCheckResult, 
  StatusTransition, 
  CheckHistoryItem, 
  NotificationItem, 
  MonitoringSchedule, 
  BrowserConnection, 
  AuditLogItem, 
  ApplicationSettings, 
  DashboardStats,
  ProxyStatus,
  ProxyProtocol
} from '@/types';
import { parseProxyString, maskEndpoint } from '../validation/parser';

// Default Owner ID for single-tenant / local mode
export const DEFAULT_OWNER_ID = '00000000-0000-0000-0000-000000000001';

interface DBState {
  proxies: ProxyRecord[];
  sources: ProxySource[];
  check_history: CheckHistoryItem[];
  transitions: StatusTransition[];
  notifications: NotificationItem[];
  schedules: MonitoringSchedule[];
  connections: BrowserConnection[];
  audit_logs: AuditLogItem[];
  settings: ApplicationSettings;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

function initializeSeedData(): DBState {
  const now = new Date();
  const pastHour = new Date(Date.now() - 3600000).toISOString();
  const past20m = new Date(Date.now() - 1200000).toISOString();
  const past5m = new Date(Date.now() - 300000).toISOString();

  const sources: ProxySource[] = [
    {
      id: 'src-1',
      owner_id: DEFAULT_OWNER_ID,
      name: 'Primary Enterprise Pool',
      type: 'manual',
      config: { note: 'Dedicated high-speed proxies' },
      is_active: true,
      sync_interval_minutes: 30,
      last_synced_at: past5m,
      last_sync_status: 'success',
      rate_limit_per_minute: 60,
      created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
      updated_at: past5m
    },
    {
      id: 'src-2',
      owner_id: DEFAULT_OWNER_ID,
      name: 'Public Verified Geo Feed',
      type: 'public_feed',
      config: { url: 'https://raw.githubusercontent.com/proxifly/free-proxy-list/main/proxies/protocols/socks5/data.txt' },
      is_active: true,
      sync_interval_minutes: 60,
      last_synced_at: past20m,
      last_sync_status: 'success',
      rate_limit_per_minute: 30,
      created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
      updated_at: past20m
    },
    {
      id: 'src-3',
      owner_id: DEFAULT_OWNER_ID,
      name: 'Chrome Extension Sync',
      type: 'chrome_extension',
      config: { device: 'Admin Chrome Workstation' },
      is_active: true,
      sync_interval_minutes: 15,
      last_synced_at: past5m,
      last_sync_status: 'success',
      rate_limit_per_minute: 120,
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      updated_at: past5m
    }
  ];

  const proxies: ProxyRecord[] = [
    {
      id: 'prx-101',
      owner_id: DEFAULT_OWNER_ID,
      source_id: 'src-1',
      source_name: 'Primary Enterprise Pool',
      normalized_endpoint: 'socks5://45.74.31.47:1080',
      protocol: 'socks5',
      host: '45.74.31.47',
      port: 1080,
      auth_required: false,
      current_status: 'ACTIVE',
      previous_status: 'INACTIVE',
      created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
      updated_at: past5m,
      last_checked_at: past5m,
      last_successful_check_at: past5m,
      last_latency_ms: 124,
      next_scheduled_check_at: new Date(Date.now() + 600000).toISOString(),
      check_interval_seconds: 900,
      consecutive_failures: 0,
      recovery_count: 2,
      is_quarantined: false,
      country_code: 'NL',
      anonymity: 'elite',
      tags: ['datacenter', 'fast', 'production']
    },
    {
      id: 'prx-102',
      owner_id: DEFAULT_OWNER_ID,
      source_id: 'src-1',
      source_name: 'Primary Enterprise Pool',
      normalized_endpoint: 'https://141.98.153.86:8443',
      protocol: 'https',
      host: '141.98.153.86',
      port: 8443,
      auth_required: false,
      current_status: 'ACTIVE',
      previous_status: 'ACTIVE',
      created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
      updated_at: past5m,
      last_checked_at: past5m,
      last_successful_check_at: past5m,
      last_latency_ms: 210,
      next_scheduled_check_at: new Date(Date.now() + 900000).toISOString(),
      check_interval_seconds: 900,
      consecutive_failures: 0,
      recovery_count: 1,
      is_quarantined: false,
      country_code: 'DE',
      anonymity: 'anonymous',
      tags: ['residential', 'eu']
    },
    {
      id: 'prx-103',
      owner_id: DEFAULT_OWNER_ID,
      source_id: 'src-2',
      source_name: 'Public Verified Geo Feed',
      normalized_endpoint: 'socks5://94.141.178.82:9050',
      protocol: 'socks5',
      host: '94.141.178.82',
      port: 9050,
      auth_required: false,
      current_status: 'INACTIVE',
      previous_status: 'ACTIVE',
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      updated_at: past20m,
      last_checked_at: past20m,
      last_successful_check_at: pastHour,
      last_failure_category: 'TIMEOUT',
      last_failure_reason: 'Connection attempt timed out waiting for proxy acknowledgment',
      last_latency_ms: 6012,
      next_scheduled_check_at: new Date(Date.now() + 180000).toISOString(),
      check_interval_seconds: 300,
      consecutive_failures: 2,
      recovery_count: 3,
      is_quarantined: false,
      country_code: 'JP',
      anonymity: 'elite',
      tags: ['monitoring', 'backoff-stage-1']
    },
    {
      id: 'prx-104',
      owner_id: DEFAULT_OWNER_ID,
      source_id: 'src-1',
      source_name: 'Primary Enterprise Pool',
      normalized_endpoint: 'http://auth_user:••••••@38.154.233.182:3128',
      protocol: 'http',
      host: '38.154.233.182',
      port: 3128,
      auth_required: true,
      username: 'auth_user',
      password: 'secret_password_123',
      current_status: 'AUTH_REQUIRED',
      previous_status: 'UNKNOWN',
      created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
      updated_at: pastHour,
      last_checked_at: pastHour,
      last_failure_category: 'AUTHENTICATION_REQUIRED',
      last_failure_reason: 'HTTP 407 Proxy Authentication Required',
      last_latency_ms: 145,
      next_scheduled_check_at: new Date(Date.now() + 1800000).toISOString(),
      check_interval_seconds: 1800,
      consecutive_failures: 1,
      recovery_count: 0,
      is_quarantined: false,
      country_code: 'GB',
      anonymity: 'transparent',
      tags: ['corporate', 'auth-gate']
    },
    {
      id: 'prx-105',
      owner_id: DEFAULT_OWNER_ID,
      source_id: 'src-2',
      source_name: 'Public Verified Geo Feed',
      normalized_endpoint: 'socks4://51.15.211.42:1080',
      protocol: 'socks4',
      host: '51.15.211.42',
      port: 1080,
      auth_required: false,
      current_status: 'INVALID',
      previous_status: 'INACTIVE',
      created_at: new Date(Date.now() - 86400000 * 6).toISOString(),
      updated_at: pastHour,
      last_checked_at: pastHour,
      last_failure_category: 'CONNECTION_REFUSED',
      last_failure_reason: 'Consistently refused connections over 6 consecutive cycles',
      last_latency_ms: 15,
      next_scheduled_check_at: new Date(Date.now() + 86400000).toISOString(),
      check_interval_seconds: 86400,
      consecutive_failures: 6,
      recovery_count: 0,
      is_quarantined: true,
      quarantine_reason: 'Automatic Quarantine: Exceeded consecutive failure threshold (6 failures)',
      quarantined_at: pastHour,
      country_code: 'CA',
      anonymity: 'anonymous',
      tags: ['quarantined', 'recoverable']
    },
    {
      id: 'prx-106',
      owner_id: DEFAULT_OWNER_ID,
      source_id: 'src-3',
      source_name: 'Chrome Extension Sync',
      normalized_endpoint: 'http://103.149.130.38:8080',
      protocol: 'http',
      host: '103.149.130.38',
      port: 8080,
      auth_required: false,
      current_status: 'ACTIVE',
      previous_status: 'UNKNOWN',
      created_at: past5m,
      updated_at: past5m,
      last_checked_at: past5m,
      last_successful_check_at: past5m,
      last_latency_ms: 95,
      next_scheduled_check_at: new Date(Date.now() + 900000).toISOString(),
      check_interval_seconds: 900,
      consecutive_failures: 0,
      recovery_count: 0,
      is_quarantined: false,
      country_code: 'US',
      anonymity: 'elite',
      tags: ['chrome-extension', 'synced-device']
    }
  ];

  const transitions: StatusTransition[] = [
    {
      id: 'trans-1',
      proxy_id: 'prx-101',
      owner_id: DEFAULT_OWNER_ID,
      from_status: 'INACTIVE',
      to_status: 'ACTIVE',
      transitioned_at: past5m,
      reason: 'Periodic monitoring detected health check recovery. Diagnostic ping verified.',
      notified: true,
      latency_ms: 124,
      endpoint_masked: 'socks5://45.74.31.47:1080'
    },
    {
      id: 'trans-2',
      proxy_id: 'prx-103',
      owner_id: DEFAULT_OWNER_ID,
      from_status: 'ACTIVE',
      to_status: 'INACTIVE',
      transitioned_at: past20m,
      reason: 'Connection attempt timed out waiting for proxy acknowledgment.',
      notified: true,
      latency_ms: 6012,
      endpoint_masked: 'socks5://94.141.178.82:9050'
    }
  ];

  const check_history: CheckHistoryItem[] = [
    {
      id: 'chk-1',
      proxy_id: 'prx-101',
      owner_id: DEFAULT_OWNER_ID,
      check_timestamp: past5m,
      status: 'ACTIVE',
      latency_ms: 124,
      status_code: 200,
      handshake_success: true,
      diagnostic_target: 'http://localhost:3000/api/health/diagnostic'
    },
    {
      id: 'chk-2',
      proxy_id: 'prx-103',
      owner_id: DEFAULT_OWNER_ID,
      check_timestamp: past20m,
      status: 'INACTIVE',
      latency_ms: 6012,
      handshake_success: false,
      error_category: 'TIMEOUT',
      error_message: 'Connection attempt timed out after 6000ms'
    },
    {
      id: 'chk-3',
      proxy_id: 'prx-104',
      owner_id: DEFAULT_OWNER_ID,
      check_timestamp: pastHour,
      status: 'AUTH_REQUIRED',
      latency_ms: 145,
      status_code: 407,
      handshake_success: true,
      error_category: 'AUTHENTICATION_REQUIRED',
      error_message: 'HTTP 407 Proxy Authentication Required'
    }
  ];

  const notifications: NotificationItem[] = [
    {
      id: 'notif-1',
      owner_id: DEFAULT_OWNER_ID,
      title: 'Proxy Recovered: INACTIVE -> ACTIVE',
      message: 'Proxy socks5://45.74.31.47:1080 passed diagnostic checks. Latency: 124ms.',
      channel: 'in_app',
      type: 'proxy_recovered',
      proxy_id: 'prx-101',
      is_read: false,
      created_at: past5m
    },
    {
      id: 'notif-2',
      owner_id: DEFAULT_OWNER_ID,
      title: 'Proxy Downtime Detected',
      message: 'Proxy socks5://94.141.178.82:9050 failed connectivity test. Scheduled for backoff retry.',
      channel: 'in_app',
      type: 'proxy_failed',
      proxy_id: 'prx-103',
      is_read: true,
      created_at: past20m
    }
  ];

  const schedules: MonitoringSchedule[] = [
    {
      id: 'sched-1',
      owner_id: DEFAULT_OWNER_ID,
      name: 'High-Priority Inactive Recovery (5m)',
      interval_seconds: 300,
      is_active: true,
      target_status: ['INACTIVE', 'UNKNOWN'],
      backoff_strategy: 'bounded_exponential',
      max_interval_seconds: 3600,
      jitter_factor: 0.25,
      created_at: new Date(Date.now() - 86400000 * 5).toISOString()
    },
    {
      id: 'sched-2',
      owner_id: DEFAULT_OWNER_ID,
      name: 'Standard Active Health Verification (15m)',
      interval_seconds: 900,
      is_active: true,
      target_status: ['ACTIVE'],
      backoff_strategy: 'fixed',
      max_interval_seconds: 900,
      jitter_factor: 0.1,
      created_at: new Date(Date.now() - 86400000 * 5).toISOString()
    },
    {
      id: 'sched-3',
      owner_id: DEFAULT_OWNER_ID,
      name: 'Quarantine Maintenance & Pruning (24h)',
      interval_seconds: 86400,
      is_active: true,
      target_status: ['INVALID'],
      backoff_strategy: 'fixed',
      max_interval_seconds: 86400,
      jitter_factor: 0.05,
      created_at: new Date(Date.now() - 86400000 * 5).toISOString()
    }
  ];

  const connections: BrowserConnection[] = [
    {
      id: 'conn-1',
      owner_id: DEFAULT_OWNER_ID,
      device_name: 'Chrome on Windows 11 (Main Workstation)',
      pairing_token: 'dev-chrome-extension-pairing-token-321',
      is_connected: true,
      last_synced_at: past5m,
      detected_proxy_type: 'fixed_servers',
      created_at: new Date(Date.now() - 86400000 * 2).toISOString()
    }
  ];

  const audit_logs: AuditLogItem[] = [
    {
      id: 'aud-1',
      owner_id: DEFAULT_OWNER_ID,
      action: 'SYSTEM_STARTUP',
      entity_type: 'SYSTEM',
      details: { message: 'Proxy Monitoring Platform engine initialized with secure SSRF sandbox' },
      ip_address: '127.0.0.1',
      created_at: new Date(Date.now() - 86400000 * 5).toISOString()
    },
    {
      id: 'aud-2',
      owner_id: DEFAULT_OWNER_ID,
      action: 'PROXY_QUARANTINED',
      entity_type: 'PROXY',
      entity_id: 'prx-105',
      details: { reason: 'Exceeded consecutive failure threshold of 5' },
      ip_address: '127.0.0.1',
      created_at: pastHour
    }
  ];

  const settings: ApplicationSettings = {
    owner_id: DEFAULT_OWNER_ID,
    auto_quarantine_enabled: true,
    quarantine_threshold_failures: 5,
    discord_webhook_url: '',
    email_alerts_enabled: false,
    alert_email_address: 'admin@proxyintel.local',
    max_check_timeout_ms: 6000,
    default_check_interval_seconds: 900,
    rate_limit_per_minute: 120,
    redact_sensitive_endpoints: true,
    ai_assistant_auto_diagnose: true
  };

  return {
    proxies,
    sources,
    check_history,
    transitions,
    notifications,
    schedules,
    connections,
    audit_logs,
    settings
  };
}

class Repository {
  private state: DBState;

  constructor() {
    this.state = this.loadState();
  }

  private loadState(): DBState {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Failed to load existing store.json, using seed data:', e);
    }

    const initial = initializeSeedData();
    this.saveStateDirect(initial);
    return initial;
  }

  private saveStateDirect(s: DBState) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(s, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write store.json:', err);
    }
  }

  private save() {
    this.saveStateDirect(this.state);
  }

  // --- PROXIES ---
  public getProxies(filters: {
    owner_id?: string;
    status?: ProxyStatus;
    protocol?: ProxyProtocol;
    source_id?: string;
    search?: string;
    country_code?: string;
    is_quarantined?: boolean;
    page?: number;
    limit?: number;
    sort_by?: 'latency' | 'created_at' | 'last_checked_at' | 'host';
    sort_order?: 'asc' | 'desc';
  } = {}): { data: ProxyRecord[]; total: number; page: number; limit: number } {
    let list = this.state.proxies.slice();

    if (filters.owner_id) {
      list = list.filter(p => p.owner_id === filters.owner_id);
    }

    if (filters.status) {
      list = list.filter(p => p.current_status === filters.status);
    }

    if (filters.protocol) {
      list = list.filter(p => p.protocol === filters.protocol);
    }

    if (filters.source_id) {
      list = list.filter(p => p.source_id === filters.source_id);
    }

    if (filters.country_code && filters.country_code !== 'ALL') {
      const c = filters.country_code.toUpperCase();
      list = list.filter(p => p.country_code && p.country_code.toUpperCase() === c);
    }

    if (filters.is_quarantined !== undefined) {
      list = list.filter(p => p.is_quarantined === filters.is_quarantined);
    }

    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(p => 
        p.normalized_endpoint.toLowerCase().includes(q) ||
        p.host.toLowerCase().includes(q) ||
        p.port.toString().includes(q) ||
        p.protocol.toLowerCase().includes(q) ||
        (p.country_code && p.country_code.toLowerCase().includes(q)) ||
        (p.source_name && p.source_name.toLowerCase().includes(q)) ||
        (p.last_failure_reason && p.last_failure_reason.toLowerCase().includes(q))
      );
    }

    // Sorting
    const sortField = filters.sort_by || 'created_at';
    const order = filters.sort_order || 'desc';

    list.sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;
      if (sortField === 'latency') {
        valA = a.last_latency_ms || 999999;
        valB = b.last_latency_ms || 999999;
      } else if (sortField === 'host') {
        valA = a.host;
        valB = b.host;
      } else if (sortField === 'last_checked_at') {
        valA = a.last_checked_at || '';
        valB = b.last_checked_at || '';
      } else {
        valA = a.created_at || '';
        valB = b.created_at || '';
      }
      if (order === 'asc') return valA > valB ? 1 : -1;
      return valA < valB ? 1 : -1;
    });

    const total = list.length;
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const startIndex = (page - 1) * limit;
    const paged = list.slice(startIndex, startIndex + limit);

    return { data: paged, total, page, limit };
  }

  public getProxyById(id: string): ProxyRecord | undefined {
    return this.state.proxies.find(p => p.id === id);
  }

  public insertProxy(record: Omit<ProxyRecord, 'id' | 'created_at' | 'updated_at' | 'next_scheduled_check_at' | 'consecutive_failures' | 'recovery_count' | 'is_quarantined'>): { record: ProxyRecord; is_duplicate: boolean } {
    const existing = this.state.proxies.find(
      p => p.owner_id === record.owner_id && p.normalized_endpoint.toLowerCase() === record.normalized_endpoint.toLowerCase()
    );

    if (existing) {
      return { record: existing, is_duplicate: true };
    }

    const id = `prx-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    
    // Look up source name if present
    let source_name = record.source_name;
    if (record.source_id && !source_name) {
      const src = this.state.sources.find(s => s.id === record.source_id);
      if (src) source_name = src.name;
    }

    const newRecord: ProxyRecord = {
      ...record,
      id,
      source_name,
      consecutive_failures: 0,
      recovery_count: 0,
      is_quarantined: false,
      created_at: now,
      updated_at: now,
      next_scheduled_check_at: now,
      tags: record.tags || []
    };

    this.state.proxies.unshift(newRecord);
    this.addAuditLog({
      owner_id: record.owner_id,
      action: 'PROXY_CREATED',
      entity_type: 'PROXY',
      entity_id: id,
      details: { endpoint: maskEndpoint(record.normalized_endpoint), protocol: record.protocol }
    });

    this.save();
    return { record: newRecord, is_duplicate: false };
  }

  public updateProxyCheck(id: string, checkResult: ProxyCheckResult): { record: ProxyRecord; transition?: StatusTransition } | null {
    const proxy = this.state.proxies.find(p => p.id === id);
    if (!proxy) return null;

    const previousStatus = proxy.current_status;
    const now = new Date().toISOString();

    proxy.last_checked_at = now;
    proxy.last_latency_ms = checkResult.latency_ms;
    proxy.updated_at = now;

    let transition: StatusTransition | undefined;

    if (checkResult.status === 'ACTIVE') {
      proxy.last_successful_check_at = now;
      proxy.consecutive_failures = 0;
      proxy.last_failure_category = undefined;
      proxy.last_failure_reason = undefined;

      // Detection of recovery: INACTIVE/UNKNOWN -> ACTIVE
      if (previousStatus === 'INACTIVE' || previousStatus === 'UNKNOWN') {
        proxy.recovery_count += 1;
        transition = {
          id: `trans-${Date.now().toString(36)}`,
          proxy_id: proxy.id,
          owner_id: proxy.owner_id,
          from_status: previousStatus,
          to_status: 'ACTIVE',
          transitioned_at: now,
          reason: 'Proxy successfully completed diagnostic connectivity handshake',
          notified: true,
          latency_ms: checkResult.latency_ms,
          endpoint_masked: maskEndpoint(proxy.normalized_endpoint)
        };
        this.state.transitions.unshift(transition);

        // Emit notification
        this.addNotification({
          owner_id: proxy.owner_id,
          title: 'Proxy Recovered: INACTIVE -> ACTIVE',
          message: `Proxy ${maskEndpoint(proxy.normalized_endpoint)} has recovered. Latency: ${checkResult.latency_ms}ms.`,
          channel: 'in_app',
          type: 'proxy_recovered',
          proxy_id: proxy.id
        });
      }
    } else {
      // Inactive or failing
      proxy.consecutive_failures += 1;
      proxy.last_failure_category = checkResult.error_category;
      proxy.last_failure_reason = checkResult.error_message;

      // Transition from ACTIVE -> INACTIVE
      if (previousStatus === 'ACTIVE') {
        transition = {
          id: `trans-${Date.now().toString(36)}`,
          proxy_id: proxy.id,
          owner_id: proxy.owner_id,
          from_status: 'ACTIVE',
          to_status: checkResult.status,
          transitioned_at: now,
          reason: checkResult.error_message || 'Proxy failed connectivity probe',
          notified: true,
          latency_ms: checkResult.latency_ms,
          endpoint_masked: maskEndpoint(proxy.normalized_endpoint)
        };
        this.state.transitions.unshift(transition);

        this.addNotification({
          owner_id: proxy.owner_id,
          title: 'Proxy Downtime Detected',
          message: `Proxy ${maskEndpoint(proxy.normalized_endpoint)} became ${checkResult.status}: ${checkResult.error_message || 'Timeout'}`,
          channel: 'in_app',
          type: 'proxy_failed',
          proxy_id: proxy.id
        });
      }

      // Auto-quarantine threshold check
      if (
        this.state.settings.auto_quarantine_enabled && 
        proxy.consecutive_failures >= this.state.settings.quarantine_threshold_failures && 
        !proxy.is_quarantined
      ) {
        proxy.is_quarantined = true;
        proxy.quarantine_reason = `Auto-quarantined after ${proxy.consecutive_failures} consecutive failures`;
        proxy.quarantined_at = now;

        this.addNotification({
          owner_id: proxy.owner_id,
          title: 'Proxy Automatically Quarantined',
          message: `Endpoint ${maskEndpoint(proxy.normalized_endpoint)} quarantined due to repeated failures.`,
          channel: 'in_app',
          type: 'quarantined',
          proxy_id: proxy.id
        });
      }
    }

    proxy.previous_status = previousStatus;
    proxy.current_status = checkResult.status;

    // Calculate next scheduled check with bounded exponential backoff
    const nextInterval = this.calculateNextInterval(proxy);
    proxy.next_scheduled_check_at = new Date(Date.now() + nextInterval * 1000).toISOString();

    // Log check history
    this.state.check_history.unshift({
      id: `chk-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
      proxy_id: proxy.id,
      owner_id: proxy.owner_id,
      check_timestamp: now,
      status: checkResult.status,
      latency_ms: checkResult.latency_ms,
      status_code: checkResult.status_code,
      handshake_success: checkResult.handshake_success,
      error_category: checkResult.error_category,
      error_message: checkResult.error_message,
      diagnostic_target: checkResult.diagnostic_target
    });

    // Keep history capped to prevent unbounded growth in memory
    if (this.state.check_history.length > 500) {
      this.state.check_history = this.state.check_history.slice(0, 500);
    }

    this.save();
    return { record: proxy, transition };
  }

  /**
   * Bounded Exponential Backoff calculation with Jitter
   */
  public calculateNextInterval(proxy: ProxyRecord): number {
    const baseInterval = proxy.check_interval_seconds || 300;
    if (proxy.current_status === 'ACTIVE') {
      return baseInterval; // Regular polling for active proxies
    }

    // Exponential backoff: base * 2^(failures) capped at 24 hours (86400s)
    const factor = Math.min(proxy.consecutive_failures, 8);
    let interval = baseInterval * Math.pow(1.5, factor);
    const maxInterval = 86400; // 24 hours
    interval = Math.min(interval, maxInterval);

    // Apply jitter (+/- 15%)
    const jitter = interval * 0.15 * (Math.random() * 2 - 1);
    return Math.max(60, Math.floor(interval + jitter));
  }

  public quarantineProxy(id: string, reason: string): ProxyRecord | null {
    const proxy = this.state.proxies.find(p => p.id === id);
    if (!proxy) return null;

    proxy.is_quarantined = true;
    proxy.quarantine_reason = reason;
    proxy.quarantined_at = new Date().toISOString();
    proxy.updated_at = new Date().toISOString();

    this.addAuditLog({
      owner_id: proxy.owner_id,
      action: 'PROXY_QUARANTINED',
      entity_type: 'PROXY',
      entity_id: proxy.id,
      details: { reason }
    });

    this.save();
    return proxy;
  }

  public restoreProxy(id: string): ProxyRecord | null {
    const proxy = this.state.proxies.find(p => p.id === id);
    if (!proxy) return null;

    proxy.is_quarantined = false;
    proxy.quarantine_reason = undefined;
    proxy.quarantined_at = undefined;
    proxy.consecutive_failures = 0;
    proxy.current_status = 'UNKNOWN'; // Needs fresh check
    proxy.next_scheduled_check_at = new Date().toISOString();
    proxy.updated_at = new Date().toISOString();

    this.addAuditLog({
      owner_id: proxy.owner_id,
      action: 'PROXY_RESTORED',
      entity_type: 'PROXY',
      entity_id: proxy.id,
      details: { endpoint: maskEndpoint(proxy.normalized_endpoint) }
    });

    this.save();
    return proxy;
  }

  public deleteProxy(id: string): boolean {
    const idx = this.state.proxies.findIndex(p => p.id === id);
    if (idx === -1) return false;

    const proxy = this.state.proxies[idx];
    this.state.proxies.splice(idx, 1);

    this.addAuditLog({
      owner_id: proxy.owner_id,
      action: 'PROXY_DELETED',
      entity_type: 'PROXY',
      entity_id: id,
      details: { endpoint: maskEndpoint(proxy.normalized_endpoint) }
    });

    this.save();
    return true;
  }

  // --- SOURCES ---
  public getSources(owner_id: string = DEFAULT_OWNER_ID): ProxySource[] {
    return this.state.sources.filter(s => s.owner_id === owner_id);
  }

  public insertSource(src: Omit<ProxySource, 'id' | 'created_at' | 'updated_at'>): ProxySource {
    const id = `src-${Date.now().toString(36)}`;
    const now = new Date().toISOString();
    const newSrc: ProxySource = {
      ...src,
      id,
      created_at: now,
      updated_at: now
    };
    this.state.sources.push(newSrc);
    this.save();
    return newSrc;
  }

  public updateSource(id: string, updates: Partial<ProxySource>): ProxySource | null {
    const s = this.state.sources.find(src => src.id === id);
    if (!s) return null;
    Object.assign(s, updates);
    s.updated_at = new Date().toISOString();
    this.save();
    return s;
  }

  public deleteSource(id: string): boolean {
    const idx = this.state.sources.findIndex(s => s.id === id);
    if (idx === -1) return false;
    this.state.sources.splice(idx, 1);
    this.save();
    return true;
  }

  // --- SCHEDULES ---
  public getSchedules(owner_id: string = DEFAULT_OWNER_ID): MonitoringSchedule[] {
    return this.state.schedules.filter(s => s.owner_id === owner_id);
  }

  public updateSchedule(id: string, updates: Partial<MonitoringSchedule>): MonitoringSchedule | null {
    const s = this.state.schedules.find(item => item.id === id);
    if (!s) return null;
    Object.assign(s, updates);
    this.save();
    return s;
  }

  // --- NOTIFICATIONS ---
  public getNotifications(owner_id: string = DEFAULT_OWNER_ID): NotificationItem[] {
    return this.state.notifications.filter(n => n.owner_id === owner_id);
  }

  public addNotification(item: Omit<NotificationItem, 'id' | 'created_at' | 'is_read'>): NotificationItem {
    const notif: NotificationItem = {
      ...item,
      id: `notif-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
      is_read: false,
      created_at: new Date().toISOString()
    };
    this.state.notifications.unshift(notif);
    this.save();
    return notif;
  }

  public markNotificationRead(id: string): boolean {
    const n = this.state.notifications.find(item => item.id === id);
    if (!n) return false;
    n.is_read = true;
    this.save();
    return true;
  }

  public markAllNotificationsRead(owner_id: string = DEFAULT_OWNER_ID): void {
    for (const n of this.state.notifications) {
      if (n.owner_id === owner_id) n.is_read = true;
    }
    this.save();
  }

  // --- TRANSITIONS & AUDIT LOGS ---
  public getTransitions(owner_id: string = DEFAULT_OWNER_ID): StatusTransition[] {
    return this.state.transitions.filter(t => t.owner_id === owner_id);
  }

  public getCheckHistory(owner_id: string = DEFAULT_OWNER_ID): CheckHistoryItem[] {
    return this.state.check_history.filter(c => c.owner_id === owner_id);
  }

  public getAuditLogs(owner_id: string = DEFAULT_OWNER_ID): AuditLogItem[] {
    return this.state.audit_logs.filter(a => a.owner_id === owner_id);
  }

  public addAuditLog(item: Omit<AuditLogItem, 'id' | 'created_at'>): void {
    const log: AuditLogItem = {
      ...item,
      id: `aud-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
      created_at: new Date().toISOString()
    };
    this.state.audit_logs.unshift(log);
    if (this.state.audit_logs.length > 500) {
      this.state.audit_logs = this.state.audit_logs.slice(0, 500);
    }
  }

  // --- SETTINGS ---
  public getSettings(owner_id: string = DEFAULT_OWNER_ID): ApplicationSettings {
    return this.state.settings;
  }

  public updateSettings(owner_id: string, updates: Partial<ApplicationSettings>): ApplicationSettings {
    Object.assign(this.state.settings, updates);
    this.save();
    return this.state.settings;
  }

  // --- CHROME EXTENSION CONNECTIONS ---
  public getBrowserConnections(owner_id: string = DEFAULT_OWNER_ID): BrowserConnection[] {
    return this.state.connections.filter(c => c.owner_id === owner_id);
  }

  public registerBrowserConnection(conn: Omit<BrowserConnection, 'id' | 'created_at'>): BrowserConnection {
    const existing = this.state.connections.find(c => c.pairing_token === conn.pairing_token);
    if (existing) {
      existing.device_name = conn.device_name;
      existing.is_connected = true;
      existing.last_synced_at = new Date().toISOString();
      existing.detected_proxy_type = conn.detected_proxy_type;
      this.save();
      return existing;
    }

    const newConn: BrowserConnection = {
      ...conn,
      id: `conn-${Date.now().toString(36)}`,
      created_at: new Date().toISOString()
    };
    this.state.connections.push(newConn);
    this.save();
    return newConn;
  }

  // --- DASHBOARD STATS ---
  public getDashboardStats(owner_id: string = DEFAULT_OWNER_ID): DashboardStats {
    const userProxies = this.state.proxies.filter(p => p.owner_id === owner_id);
    
    let active = 0;
    let inactive = 0;
    let invalid = 0;
    let quarantined = 0;
    let authRequired = 0;
    let unknown = 0;
    let totalLatency = 0;
    let latencyCount = 0;
    let recoveredRecently = 0;

    const protocolCounts: Record<ProxyProtocol, number> = {
      http: 0,
      https: 0,
      socks4: 0,
      socks5: 0
    };

    const statusCounts: Record<ProxyStatus, number> = {
      ACTIVE: 0,
      INACTIVE: 0,
      INVALID: 0,
      AUTH_REQUIRED: 0,
      DUPLICATE: 0,
      UNKNOWN: 0
    };

    for (const p of userProxies) {
      if (p.is_quarantined) {
        quarantined++;
      }

      statusCounts[p.current_status] = (statusCounts[p.current_status] || 0) + 1;
      protocolCounts[p.protocol] = (protocolCounts[p.protocol] || 0) + 1;

      if (p.current_status === 'ACTIVE') {
        active++;
        if (p.last_latency_ms) {
          totalLatency += p.last_latency_ms;
          latencyCount++;
        }
      } else if (p.current_status === 'INACTIVE') {
        inactive++;
      } else if (p.current_status === 'INVALID') {
        invalid++;
      } else if (p.current_status === 'AUTH_REQUIRED') {
        authRequired++;
      } else {
        unknown++;
      }

      if (p.recovery_count > 0) {
        recoveredRecently += p.recovery_count;
      }
    }

    const todayChecks = this.state.check_history.filter(c => {
      const checkDate = new Date(c.check_timestamp);
      const today = new Date();
      return checkDate.toDateString() === today.toDateString();
    }).length;

    const avgLatency = latencyCount > 0 ? Math.round(totalLatency / latencyCount) : 0;
    const uptimePercentage = userProxies.length > 0 
      ? Math.round((active / (active + inactive || 1)) * 100) 
      : 100;

    // Real 7-day trend calculation from actual check_history & transitions
    const dates = ['6d ago', '5d ago', '4d ago', '3d ago', '2d ago', 'Yesterday', 'Today'];
    const activeTrend: number[] = [];
    const inactiveTrend: number[] = [];
    const recoveredTrend: number[] = [];

    const now = new Date();
    for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
      const targetDate = new Date(now.getTime() - dayOffset * 86400000).toDateString();

      const dayChecks = this.state.check_history.filter(c => 
        new Date(c.check_timestamp).toDateString() === targetDate
      );
      const dayActive = dayChecks.filter(c => c.status === 'ACTIVE').length;
      const dayInactive = dayChecks.filter(c => c.status === 'INACTIVE').length;

      const dayRecoveries = this.state.transitions.filter(t => 
        new Date(t.transitioned_at).toDateString() === targetDate &&
        t.from_status === 'INACTIVE' && t.to_status === 'ACTIVE'
      ).length;

      activeTrend.push(dayOffset === 0 ? active : dayActive);
      inactiveTrend.push(dayOffset === 0 ? inactive : dayInactive);
      recoveredTrend.push(dayRecoveries);
    }

    return {
      total_discovered: userProxies.length,
      active_count: active,
      inactive_count: inactive,
      invalid_count: invalid,
      quarantined_count: quarantined,
      auth_required_count: authRequired,
      unknown_count: unknown,
      checks_completed_today: todayChecks,
      recovered_recently_count: recoveredRecently,
      average_latency_ms: avgLatency,
      configured_sources_count: this.state.sources.length,
      uptime_percentage: uptimePercentage,
      trends: {
        dates,
        active: activeTrend,
        inactive: inactiveTrend,
        recovered: recoveredTrend
      },
      protocol_distribution: protocolCounts,
      status_distribution: statusCounts
    };
  }
}

// Global Singleton
const globalForRepo = global as unknown as { repo: Repository };
export const repo = globalForRepo.repo || new Repository();
if (process.env.NODE_ENV !== 'production') globalForRepo.repo = repo;
