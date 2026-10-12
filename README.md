# AI Proxy Intelligence, Discovery & Monitoring Platform

An enterprise-grade full-stack platform for proxy inventory management, health verification, SSRF-protected diagnostic probing, automatic inactive proxy recovery monitoring, and browser companion synchronization.

---

## 🌟 Key Capabilities

1. **Multi-Source Discovery Engine**:
   - **Manual Single Entry**: Instant syntax and port validation.
   - **Bulk Text Ingestion**: Multi-line `host:port`, `user:pass@host:port`, and `host:port:user:pass`.
   - **File Importer**: Supports CSV, TXT, and JSON formats.
   - **Authorized Public Feeds**: Ingestion of verified public lists with domain protection and SSRF sanitization.
   - **Chrome Extension Sync**: Syncs currently active Chrome proxy settings using browser APIs with explicit user consent.
   - **Modular Adapter Plugin Interface**: Clean extensible architecture for third-party providers.

2. **Proxy Validation Engine & Security Sandbox**:
   - **Protocols Supported**: HTTP, HTTPS, SOCKS4, and SOCKS5.
   - **SSRF Protection**: Strict blocking of RFC 1918 private subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), loopback (`127.0.0.0/8`, `::1`), link-local (`169.254.0.0/16`), and cloud metadata IPs (`169.254.169.254`).
   - **Controlled Diagnostic Endpoint**: Probes hit the internal diagnostic target (`/api/health/diagnostic`) with expected token signatures; avoids unauthorized third-party probing.
   - **Classification State Machine**: `ACTIVE`, `INACTIVE`, `INVALID`, `AUTH_REQUIRED`, `DUPLICATE`, and `UNKNOWN`.
   - **Latency Timing**: Nanosecond-precise TCP connection and protocol handshake measurements.

3. **Automatic Inactive Monitoring & Recovery**:
   - **State Persistence**: Inactive proxies are preserved with full database history and error details.
   - **Bounded Exponential Backoff with Jitter**: Configurable schedules (5m, 15m, 30m, 1h, 6h, 24h) prevent endpoint spamming while tracking recoveries.
   - **Zero-Duplicate Transition Notifications**: Detects `INACTIVE -> ACTIVE` recovery transitions and dispatches alerts via In-App feed, Discord webhooks, or email without spamming unchanged states.

4. **Quarantine & Recovery Module**:
   - Auto-quarantines records exceeding configurable consecutive failure thresholds.
   - Preserves quarantined records in a recoverable quarantine bin with clear diagnostics.
   - Allows instant one-click restoration or permanent purge.

5. **AI Assistant Copilot (Zero Hallucination)**:
   - Embedded dashboard copilot utilizing structured tool execution against the real database.
   - Answers queries like *"Show all currently active proxies"*, *"Which inactive proxies recovered today?"*, and *"Why did this endpoint fail?"* without fabricating records.
   - Heuristic fallback engine runs out-of-the-box even without an OpenAI API key.

6. **Chrome Browser Companion Extension**:
   - Manifest V3 extension in `extension/`.
   - Uses `chrome.proxy.settings.get()` with explicit consent modal.
   - Connects to `/api/chrome/sync` with cryptographic pairing tokens.
   - Zero collection of browsing history or private user traffic.

---

## 🛠️ Architecture & Tech Stack

- **Frontend**: Next.js 14 App Router, TypeScript, Tailwind CSS, Lucide Icons.
- **Backend**: Next.js API Routes (Serverless/Node runtime).
- **Database**: Supabase PostgreSQL with Row-Level Security (RLS) policies (`supabase/migrations/20261012000000_initial_schema.sql`) and local hybrid atomic storage fallback.
- **Worker Daemon**: Node.js/TypeScript daemon (`worker/index.ts`) with concurrency control, retry jitter, and HTTP health server on port `3001`.
- **Browser Extension**: Manifest V3 extension in `extension/`.

---

## 🚀 Quickstart & Local Development

### 1. Installation
Clone the repository and install dependencies:
```bash
npm install
```

### 2. Environment Configuration
Copy the environment template:
```bash
cp .env.example .env.local
```

### 3. Run Automated Test Suite
Run the 21 automated tests covering syntax parsing, SSRF blocks, deduplication, backoff curves, and recovery transitions:
```bash
npm test
```

### 4. Build Production Bundle
Verify TypeScript types and production compilation:
```bash
npm run build
```

### 5. Launch the Platform
Start the web dashboard:
```bash
npm start
# Dashboard available at http://localhost:3000
```

In a separate terminal, launch the background monitoring worker daemon:
```bash
npx tsx worker/index.ts
# Healthcheck server available at http://localhost:3001/health
```

---

## 📦 Project Structure

```
├── .env.example                     # Environment template
├── .env.local                       # Local development configuration
├── extension/                       # Chrome Extension (Manifest V3)
│   ├── manifest.json
│   ├── popup.html
│   ├── popup.js
│   ├── popup.css
│   └── background.js
├── src/
│   ├── app/                         # Next.js App Router
│   │   ├── api/                     # 14 REST API endpoints
│   │   │   ├── ai/chat/
│   │   │   ├── chrome/sync/
│   │   │   ├── health/diagnostic/   # Controlled test destination
│   │   │   ├── notifications/
│   │   │   ├── proxies/             # Ingest, inspect, check, quarantine, bulk, export
│   │   │   ├── schedules/
│   │   │   ├── settings/
│   │   │   ├── sources/
│   │   │   ├── stats/
│   │   │   └── worker/run-now/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx                 # Unified dashboard with 15 views
│   ├── components/
│   │   ├── ai/                      # AI Assistant Drawer
│   │   ├── dashboard/               # Metric Stat Cards & SVG Trend Charts
│   │   ├── layout/                  # Sidebar & Header
│   │   ├── modals/                  # Import, Export, and Inspection modals
│   │   ├── proxies/                 # Proxy Table with bulk actions
│   │   └── views/                   # 15 dedicated sub-views
│   ├── lib/
│   │   ├── ai/                      # AI assistant & tool execution engine
│   │   ├── checker/                 # Proxy validation engine (HTTP, HTTPS, SOCKS4/5)
│   │   ├── db/                      # Repository layer with atomic persistence
│   │   ├── discovery/               # Discovery engine & adapters
│   │   ├── notifications/           # Multi-channel alert dispatcher
│   │   ├── security/                # SSRF guard & safe DNS resolver
│   │   └── validation/              # Normalizer, syntax validator & masker
│   └── types/                       # TypeScript definitions
├── supabase/
│   └── migrations/
│       └── 20261012000000_initial_schema.sql # Complete SQL schema with RLS
├── tests/                           # Vitest test suite
│   ├── parser.test.ts
│   ├── ssrf.test.ts
│   └── monitoring_transitions.test.ts
└── worker/
    └── index.ts                     # Background monitoring worker daemon
```

---

## 📄 Documentation Links

- [Deployment Guide (Vercel, Render/Railway, Supabase)](file:///c:/Users/Admin/Desktop/proxy/docs/DEPLOYMENT.md)
- [Chrome Extension Companion Guide](file:///c:/Users/Admin/Desktop/proxy/docs/CHROME_EXTENSION.md)
- [Security & SSRF Architecture](file:///c:/Users/Admin/Desktop/proxy/docs/SECURITY.md)
- [Testing Suite Documentation](file:///c:/Users/Admin/Desktop/proxy/docs/TESTING.md)
