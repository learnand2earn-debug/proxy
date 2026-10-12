export const DEFAULT_OWNER_ID = '00000000-0000-0000-0000-000000000001';

export type ProxyProtocol = 'http' | 'https' | 'socks4' | 'socks5';

export type ProxyStatus = 
  | 'ACTIVE' 
  | 'INACTIVE' 
  | 'INVALID' 
  | 'AUTH_REQUIRED' 
  | 'DUPLICATE' 
  | 'UNKNOWN';

export type SourceType = 
  | 'manual' 
  | 'bulk_paste' 
  | 'file_upload' 
  | 'provider_api' 
  | 'public_feed' 
  | 'internal_inventory' 
  | 'chrome_extension';

export interface ProxyRecord {
  id: string;
  owner_id: string;
  source_id?: string;
  source_name?: string;
  normalized_endpoint: string; // e.g. "socks5://192.0.2.1:1080"
  protocol: ProxyProtocol;
  host: string;
  port: number;
  auth_required: boolean;
  username?: string;
  password?: string;
  current_status: ProxyStatus;
  previous_status?: ProxyStatus;
  created_at: string;
  updated_at: string;
  last_checked_at?: string;
  last_successful_check_at?: string;
  last_failure_category?: string;
  last_failure_reason?: string;
  last_latency_ms?: number;
  next_scheduled_check_at: string;
  check_interval_seconds: number;
  consecutive_failures: number;
  recovery_count: number;
  is_quarantined: boolean;
  quarantine_reason?: string;
  quarantined_at?: string;
  country_code?: string;
  anonymity?: 'transparent' | 'anonymous' | 'elite' | 'unknown';
  tags: string[];
}

export interface ProxySource {
  id: string;
  owner_id: string;
  name: string;
  type: SourceType;
  config: Record<string, any>;
  is_active: boolean;
  sync_interval_minutes: number;
  last_synced_at?: string;
  last_sync_status?: 'success' | 'failed' | 'pending';
  last_sync_error?: string;
  rate_limit_per_minute: number;
  created_at: string;
  updated_at: string;
}

export interface ProxyCheckResult {
  proxy_id?: string;
  status: ProxyStatus;
  latency_ms: number;
  handshake_success: boolean;
  status_code?: number;
  error_category?: string;
  error_message?: string;
  diagnostic_target?: string;
  checked_at: string;
}

export interface StatusTransition {
  id: string;
  proxy_id: string;
  owner_id: string;
  from_status: ProxyStatus;
  to_status: ProxyStatus;
  transitioned_at: string;
  reason?: string;
  notified: boolean;
  latency_ms?: number;
  endpoint_masked?: string;
}

export interface CheckHistoryItem {
  id: string;
  proxy_id: string;
  owner_id: string;
  check_timestamp: string;
  status: ProxyStatus;
  latency_ms?: number;
  status_code?: number;
  handshake_success: boolean;
  error_category?: string;
  error_message?: string;
  diagnostic_target?: string;
}

export interface NotificationItem {
  id: string;
  owner_id: string;
  title: string;
  message: string;
  channel: 'in_app' | 'email' | 'discord' | 'webhook';
  type: 'proxy_recovered' | 'proxy_failed' | 'quarantined' | 'sync_failed' | 'system_alert';
  proxy_id?: string;
  is_read: boolean;
  created_at: string;
}

export interface MonitoringSchedule {
  id: string;
  owner_id: string;
  name: string;
  interval_seconds: number;
  is_active: boolean;
  target_status: ProxyStatus[];
  backoff_strategy: 'fixed' | 'bounded_exponential';
  max_interval_seconds: number;
  jitter_factor: number;
  created_at: string;
}

export interface BrowserConnection {
  id: string;
  owner_id: string;
  device_name: string;
  pairing_token: string;
  is_connected: boolean;
  last_synced_at?: string;
  detected_proxy_type?: string;
  created_at: string;
}

export interface AuditLogItem {
  id: string;
  owner_id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details: Record<string, any>;
  ip_address?: string;
  created_at: string;
}

export interface ApplicationSettings {
  owner_id: string;
  auto_quarantine_enabled: boolean;
  quarantine_threshold_failures: number;
  discord_webhook_url: string;
  email_alerts_enabled: boolean;
  alert_email_address: string;
  max_check_timeout_ms: number;
  default_check_interval_seconds: number;
  rate_limit_per_minute: number;
  redact_sensitive_endpoints: boolean;
  ai_assistant_auto_diagnose: boolean;
}

export interface DashboardStats {
  total_discovered: number;
  active_count: number;
  inactive_count: number;
  invalid_count: number;
  quarantined_count: number;
  auth_required_count: number;
  unknown_count: number;
  checks_completed_today: number;
  recovered_recently_count: number;
  average_latency_ms: number;
  configured_sources_count: number;
  uptime_percentage: number;
  trends: {
    dates: string[];
    active: number[];
    inactive: number[];
    recovered: number[];
  };
  protocol_distribution: Record<ProxyProtocol, number>;
  status_distribution: Record<ProxyStatus, number>;
}
