# Enterprise Deployment Guide

This guide details the deployment of the **AI Proxy Intelligence, Discovery & Monitoring Platform** across Vercel (Frontend & Serverless API), Supabase (Database & Auth), and Render / Railway (Background Monitoring Worker).

---

## 1. Supabase Setup (Database & Security)

### A. Create Project
1. Log in to [Supabase](https://supabase.com) and create a new project.
2. Note your **Project URL** (`https://<project-ref>.supabase.co`) and **Anon Key**.
3. In Project Settings -> API, retrieve your **service_role** key (keep this secret; only used by backend services).

### B. Apply Migrations
Execute the SQL migration located at `supabase/migrations/20261012000000_initial_schema.sql` via the Supabase SQL Editor or Supabase CLI:
```bash
supabase db push
# or copy/paste the SQL file contents into the Supabase Web SQL Editor
```

This creates all 12 normalized tables (`proxy_records`, `proxy_sources`, `status_transitions`, etc.), creates performance indexes, and enables strict Row-Level Security (RLS) policies.

---

## 2. Vercel Deployment (Frontend & API Routes)

### A. Connect Repository
1. Push this repository to GitHub or GitLab.
2. In the [Vercel Dashboard](https://vercel.com), click **Add New** -> **Project** and import the repository.
3. Framework Preset: **Next.js**.

### B. Configure Environment Variables
Add the following environment variables in Vercel Project Settings:
```ini
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DB_MODE=hybrid
ALLOW_INTERNAL_IPS=false
MAX_CHECK_TIMEOUT_MS=6000
CHROME_SYNC_SECRET=your-secure-pairing-secret-token
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

### C. Deploy
Click **Deploy**. Vercel will build and launch the Next.js App Router application.

---

## 3. Render / Railway Deployment (Background Worker Daemon)

Continuous monitoring requires a persistent worker daemon that does not terminate with page requests.

### Option A: Render
1. Create a **Background Worker** (or **Web Service** if you want external health check pings).
2. Connect your repository.
3. Build Command:
   ```bash
   npm install && npm run build
   ```
4. Start Command:
   ```bash
   npx tsx worker/index.ts
   ```
5. Environment Variables:
   - `WORKER_PORT=3001`
   - `WORKER_CONCURRENCY=10`
   - `WORKER_POLL_INTERVAL_MS=15000`
   - `NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app`
   - `NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY=your-service-role-key`
6. Health Check Path: `/health` on port `3001`.

### Option B: Railway
1. Click **New Project** -> **Deploy from GitHub repo**.
2. Set Custom Start Command:
   ```bash
   npx tsx worker/index.ts
   ```
3. Set `PORT=3001`.
4. Configure required environment variables.

---

## 4. Health & Verification

Once deployed:
1. Verify the frontend at `https://your-domain.vercel.app`.
2. Inspect the diagnostic probe endpoint:
   ```bash
   curl -i https://your-domain.vercel.app/api/health/diagnostic
   ```
   Should return HTTP 200 with `X-Proxy-Diagnostic-Status: VERIFIED`.
3. Check the worker daemon health:
   ```bash
   curl -i https://your-worker.onrender.com/health
   ```
   Should return JSON with `status: "healthy"` and uptime statistics.
