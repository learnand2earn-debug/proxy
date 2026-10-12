# Security, SSRF Sandbox & Permissions Architecture

The **AI Proxy Intelligence Platform** is built with enterprise security controls designed to prevent abuse, Server-Side Request Forgery (SSRF), network reconnaissance, and credential exposure.

---

## 1. SSRF Sandbox & Address Restrictions

Proxy checkers are inherently exposed to network connection risks. To prevent attackers or malicious proxy lists from pivoting through the server into internal infrastructure, the platform implements a strict multi-layer SSRF filter:

### A. Blocked Subnets & Special Addresses
Before establishing any TCP socket or HTTP connection, the target hostname is checked against strict CIDR rules:
- **RFC 1918 Private Ranges**:
  - `10.0.0.0/8`
  - `172.16.0.0/12`
  - `192.168.0.0/16`
- **Loopback & Host Addresses**:
  - `127.0.0.0/8`
  - `::1`
  - `0.0.0.0/8`
- **Link-Local & Cloud Metadata Addresses**:
  - `169.254.0.0/16` (including AWS/GCP/Azure metadata address `169.254.169.254`)
  - `metadata.google.internal`
- **Carrier-Grade NAT**: `100.64.0.0/10`
- **Multicast / Broadcast**: `224.0.0.0/4`, `255.255.255.255/32`
- **IPv6 Unique Local**: `fc00::/7`
- **IPv6 Link-Local**: `fe80::/10`

### B. Safe DNS Resolution & DNS Rebinding Protection
- Hostnames are resolved to both IPv4 (`A`) and IPv6 (`AAAA`) addresses using asynchronous DNS lookups prior to socket creation.
- **Every resolved IP address** is validated against the restricted ranges. If any address in the DNS response resolves to a private or loopback IP, the request is aborted immediately with `SECURITY_VIOLATION`.

### C. Internal Network Toggle
For authorized intranet deployments where internal proxies must be monitored, an explicit operator flag (`ALLOW_INTERNAL_IPS=true`) must be set in environment variables and verified by an administrator.

---

## 2. Controlled Diagnostic Destination

- In adherence to security requirements, the platform **never probes unrelated third-party websites** to test proxies.
- Handshake connectivity and forward proxy requests hit the application's dedicated diagnostic endpoint:
  ```text
  /api/health/diagnostic
  ```
- The diagnostic route verifies the request's internal signature header (`X-Proxy-Diagnostic-Probe: ai-proxy-intel-probe-v1`) and returns a lightweight status payload.
- This ensures test requests cannot be weaponized into automated scraping or DDoS attacks against arbitrary internet targets.

---

## 3. Credential Redaction & Secret Isolation

- **Masked Endpoints**: Proxy passwords in endpoints (e.g. `socks5://user:pass@host:port`) are automatically masked (`socks5://user:••••••@host:port`) in all table responses, audit logs, and exports by default.
- **Client-Side Safety**: Secrets are never transmitted in browser JavaScript state unless an authenticated administrator explicitly requests an authorized plaintext export.
- **Database Encryption**: In Supabase PostgreSQL, provider API keys and source credentials are held in `source_credentials` tables protected by Row-Level Security policies.

---

## 4. Rate Limiting & Concurrency Controls

- Every discovery source enforces a configurable rate limit (e.g. 60 requests per minute) to prevent overwhelming upstream servers.
- The monitoring worker daemon implements strict global concurrency caps (`WORKER_CONCURRENCY=5` or `10`) to prevent local network congestion and socket exhaustion.
