-- AI Proxy Intelligence, Discovery & Monitoring Platform
-- Initial Schema & Migrations

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Proxy Sources Table
CREATE TABLE IF NOT EXISTS proxy_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('manual', 'bulk_paste', 'file_upload', 'provider_api', 'public_feed', 'internal_inventory', 'chrome_extension')),
    config JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    sync_interval_minutes INTEGER DEFAULT 60,
    last_synced_at TIMESTAMPTZ,
    last_sync_status TEXT DEFAULT 'pending',
    last_sync_error TEXT,
    rate_limit_per_minute INTEGER DEFAULT 60,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Source Credentials (Encrypted storage metadata)
CREATE TABLE IF NOT EXISTS source_credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL,
    source_id UUID NOT NULL REFERENCES proxy_sources(id) ON DELETE CASCADE,
    auth_type TEXT NOT NULL CHECK (auth_type IN ('bearer_token', 'api_key', 'basic_auth', 'header_key')),
    encrypted_secret TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Proxy Records Table
CREATE TABLE IF NOT EXISTS proxy_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL,
    source_id UUID REFERENCES proxy_sources(id) ON DELETE SET NULL,
    normalized_endpoint TEXT NOT NULL,
    protocol TEXT NOT NULL CHECK (protocol IN ('http', 'https', 'socks4', 'socks5')),
    host TEXT NOT NULL,
    port INTEGER NOT NULL CHECK (port > 0 AND port <= 65535),
    auth_required BOOLEAN DEFAULT false,
    username TEXT,
    password_masked TEXT,
    current_status TEXT NOT NULL DEFAULT 'UNKNOWN' CHECK (current_status IN ('ACTIVE', 'INACTIVE', 'INVALID', 'AUTH_REQUIRED', 'DUPLICATE', 'UNKNOWN')),
    previous_status TEXT,
    last_checked_at TIMESTAMPTZ,
    last_successful_check_at TIMESTAMPTZ,
    last_failure_category TEXT,
    last_failure_reason TEXT,
    last_latency_ms INTEGER,
    next_scheduled_check_at TIMESTAMPTZ DEFAULT NOW(),
    check_interval_seconds INTEGER DEFAULT 900,
    consecutive_failures INTEGER DEFAULT 0,
    recovery_count INTEGER DEFAULT 0,
    is_quarantined BOOLEAN DEFAULT false,
    quarantine_reason TEXT,
    quarantined_at TIMESTAMPTZ,
    country_code VARCHAR(8) DEFAULT 'XX',
    anonymity TEXT DEFAULT 'unknown',
    tags TEXT[] DEFAULT '{}'::text[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_owner_endpoint UNIQUE (owner_id, normalized_endpoint)
);

-- Indexes for proxy_records
CREATE INDEX IF NOT EXISTS idx_proxy_records_owner_status ON proxy_records(owner_id, current_status);
CREATE INDEX IF NOT EXISTS idx_proxy_records_next_check ON proxy_records(next_scheduled_check_at) WHERE is_quarantined = false;
CREATE INDEX IF NOT EXISTS idx_proxy_records_source ON proxy_records(source_id);
CREATE INDEX IF NOT EXISTS idx_proxy_records_quarantined ON proxy_records(owner_id, is_quarantined);
CREATE INDEX IF NOT EXISTS idx_proxy_records_protocol ON proxy_records(protocol);

-- 5. Proxy Check History
CREATE TABLE IF NOT EXISTS proxy_check_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proxy_id UUID NOT NULL REFERENCES proxy_records(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL,
    check_timestamp TIMESTAMPTZ DEFAULT NOW(),
    status TEXT NOT NULL,
    latency_ms INTEGER,
    status_code INTEGER,
    handshake_success BOOLEAN DEFAULT false,
    error_category TEXT,
    error_message TEXT,
    diagnostic_target TEXT,
    worker_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_check_history_proxy ON proxy_check_history(proxy_id, check_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_check_history_owner_time ON proxy_check_history(owner_id, check_timestamp DESC);

-- 6. Status Transitions (Timeline & Auditing)
CREATE TABLE IF NOT EXISTS status_transitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proxy_id UUID NOT NULL REFERENCES proxy_records(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL,
    from_status TEXT NOT NULL,
    to_status TEXT NOT NULL,
    transitioned_at TIMESTAMPTZ DEFAULT NOW(),
    reason TEXT,
    notified BOOLEAN DEFAULT false,
    latency_ms INTEGER
);
CREATE INDEX IF NOT EXISTS idx_status_transitions_owner ON status_transitions(owner_id, transitioned_at DESC);
CREATE INDEX IF NOT EXISTS idx_status_transitions_proxy ON status_transitions(proxy_id, transitioned_at DESC);

-- 7. Monitoring Schedules
CREATE TABLE IF NOT EXISTS monitoring_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL,
    name TEXT NOT NULL,
    interval_seconds INTEGER NOT NULL DEFAULT 900,
    is_active BOOLEAN DEFAULT true,
    target_status TEXT[] DEFAULT ARRAY['INACTIVE', 'UNKNOWN'],
    backoff_strategy TEXT DEFAULT 'bounded_exponential',
    max_interval_seconds INTEGER DEFAULT 86400,
    jitter_factor NUMERIC(3,2) DEFAULT 0.25,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    channel TEXT NOT NULL CHECK (channel IN ('in_app', 'email', 'discord', 'webhook')),
    type TEXT NOT NULL CHECK (type IN ('proxy_recovered', 'proxy_failed', 'quarantined', 'sync_failed', 'system_alert')),
    proxy_id UUID REFERENCES proxy_records(id) ON DELETE SET NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_owner_unread ON notifications(owner_id, is_read, created_at DESC);

-- 9. Notification Deliveries
CREATE TABLE IF NOT EXISTS notification_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    channel TEXT NOT NULL,
    destination TEXT,
    status TEXT NOT NULL CHECK (status IN ('delivered', 'failed', 'retrying')),
    attempts INTEGER DEFAULT 1,
    last_attempt_at TIMESTAMPTZ DEFAULT NOW(),
    provider_response TEXT
);

-- 10. Browser Connections (Chrome Extension sync sessions)
CREATE TABLE IF NOT EXISTS browser_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL,
    extension_id TEXT,
    device_name TEXT,
    pairing_token TEXT UNIQUE,
    is_connected BOOLEAN DEFAULT true,
    last_synced_at TIMESTAMPTZ,
    detected_proxy_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_owner ON audit_logs(owner_id, created_at DESC);

-- 12. Application Settings
CREATE TABLE IF NOT EXISTS application_settings (
    owner_id UUID PRIMARY KEY,
    auto_quarantine_enabled BOOLEAN DEFAULT true,
    quarantine_threshold_failures INTEGER DEFAULT 5,
    discord_webhook_url TEXT,
    email_alerts_enabled BOOLEAN DEFAULT false,
    alert_email_address TEXT,
    max_check_timeout_ms INTEGER DEFAULT 6000,
    default_check_interval_seconds INTEGER DEFAULT 900,
    rate_limit_per_minute INTEGER DEFAULT 120,
    redact_sensitive_endpoints BOOLEAN DEFAULT true,
    ai_assistant_auto_diagnose BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Row-Level Security Policies (RLS)
ALTER TABLE proxy_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE proxy_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE proxy_check_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE browser_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_settings ENABLE ROW LEVEL SECURITY;

-- Dynamic RLS Policies based on auth.uid()
CREATE POLICY "Users access own proxy sources" ON proxy_sources FOR ALL USING (auth.uid() = owner_id);
CREATE POLICY "Users access own proxy records" ON proxy_records FOR ALL USING (auth.uid() = owner_id);
CREATE POLICY "Users access own check history" ON proxy_check_history FOR ALL USING (auth.uid() = owner_id);
CREATE POLICY "Users access own transitions" ON status_transitions FOR ALL USING (auth.uid() = owner_id);
CREATE POLICY "Users access own notifications" ON notifications FOR ALL USING (auth.uid() = owner_id);
CREATE POLICY "Users access own audit logs" ON audit_logs FOR ALL USING (auth.uid() = owner_id);
CREATE POLICY "Users access own settings" ON application_settings FOR ALL USING (auth.uid() = owner_id);
