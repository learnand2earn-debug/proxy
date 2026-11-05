-- =========================================================================
-- AUTONOMOUS REAL-TIME PROXY INTELLIGENCE PLATFORM
-- Supabase PostgreSQL Master Setup Script
-- =========================================================================

-- 1. Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Master Table: proxy_records (Holds all discovered & tested proxies)
CREATE TABLE IF NOT EXISTS public.proxy_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    normalized_endpoint TEXT NOT NULL,
    protocol TEXT NOT NULL DEFAULT 'http',
    host TEXT NOT NULL,
    port INTEGER NOT NULL,
    auth_required BOOLEAN DEFAULT FALSE,
    username TEXT,
    password TEXT,
    current_status TEXT NOT NULL DEFAULT 'ACTIVE',
    last_latency_ms INTEGER DEFAULT 0,
    country_code TEXT DEFAULT 'US',
    city TEXT,
    anonymity TEXT DEFAULT 'elite',
    check_interval_seconds INTEGER DEFAULT 600,
    last_checked_at TIMESTAMPTZ DEFAULT NOW(),
    last_successful_check_at TIMESTAMPTZ,
    last_failure_reason TEXT,
    consecutive_failures INTEGER DEFAULT 0,
    recovery_count INTEGER DEFAULT 0,
    is_quarantined BOOLEAN DEFAULT FALSE,
    quarantine_reason TEXT,
    tags TEXT[] DEFAULT ARRAY['live-stream'],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    next_scheduled_check_at TIMESTAMPTZ DEFAULT NOW(),

    -- Required for high-speed PostgREST upsert & deduplication
    CONSTRAINT proxy_records_owner_endpoint_key UNIQUE (owner_id, normalized_endpoint)
);

-- 3. High-Performance B-Tree Indexes
CREATE INDEX IF NOT EXISTS idx_proxy_records_status ON public.proxy_records(current_status);
CREATE INDEX IF NOT EXISTS idx_proxy_records_country ON public.proxy_records(country_code);
CREATE INDEX IF NOT EXISTS idx_proxy_records_owner ON public.proxy_records(owner_id);
CREATE INDEX IF NOT EXISTS idx_proxy_records_created ON public.proxy_records(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_proxy_records_latency ON public.proxy_records(last_latency_ms ASC);
CREATE INDEX IF NOT EXISTS idx_proxy_records_live ON public.proxy_records(current_status, country_code);

-- 4. Enable Row Level Security (RLS) & Policies
ALTER TABLE public.proxy_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow API Access" ON public.proxy_records;
CREATE POLICY "Allow API Access" ON public.proxy_records
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 5. Trigger to automatically maintain updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_updated_at ON public.proxy_records;
CREATE TRIGGER trigger_set_updated_at
    BEFORE UPDATE ON public.proxy_records
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 6. 24-HOUR CLOSED PROXIES AUTO-PURGE FUNCTION
-- Automatically purges closed/inactive proxies older than 24 hours
-- LIVE ACTIVE PROXIES ARE 100% STRICTLY PRESERVED FOREVER!
CREATE OR REPLACE FUNCTION public.purge_closed_proxies_older_than_24h()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.proxy_records
    WHERE current_status != 'ACTIVE'
      AND created_at < (NOW() - INTERVAL '24 hours');

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Licenses Table (DRM & Client Access Control)
CREATE TABLE IF NOT EXISTS public.licenses (
    id TEXT PRIMARY KEY,
    license_key TEXT UNIQUE NOT NULL,
    customer_name TEXT NOT NULL,
    customer_username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    plan_type TEXT NOT NULL DEFAULT 'lifetime',
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    max_concurrent_sites INTEGER DEFAULT 1,
    active_origin TEXT,
    active_session_token TEXT,
    last_active_at TIMESTAMPTZ,
    total_logins INTEGER DEFAULT 0,
    notes TEXT,
    expires_at TIMESTAMPTZ DEFAULT '2099-12-31 23:59:59+00',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow License Access" ON public.licenses;
CREATE POLICY "Allow License Access" ON public.licenses
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 8. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow Audit Access" ON public.audit_logs;
CREATE POLICY "Allow Audit Access" ON public.audit_logs
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 9. Verification Query
SELECT 
    'proxy_records' AS table_name, 
    COUNT(*) AS current_rows, 
    'ONLINE & READY' AS status 
FROM public.proxy_records;

