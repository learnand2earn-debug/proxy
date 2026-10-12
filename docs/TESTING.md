# Testing Suite & Acceptance Criteria Guide

The platform includes an automated test suite implemented with [Vitest](https://vitest.dev). All tests use local mocked endpoints and network simulation to ensure 100% offline reproducibility without probing external websites.

---

## 1. Running the Test Suite

Execute all tests from the project root:
```bash
npm test
# or: npx vitest run
```

To run tests in watch mode during development:
```bash
npx vitest
```

---

## 2. Test Coverage & Verified Criteria

### A. Endpoint Parsing & Syntax Validation (`tests/parser.test.ts`)
- **Standard Host & Port**: Verifies default protocols, standard IPv4 addresses, and domain names.
- **Explicit Protocols**: Validates SOCKS5, SOCKS4, HTTPS, and HTTP scheme recognition.
- **Authentication Credentials**: Tests parsing both `protocol://user:pass@host:port` and `host:port:user:pass` formats.
- **Port Out of Range**: Ensures ports > 65535 or <= 0 are rejected with `is_valid: false`.
- **Malformed Hostnames**: Rejects invalid characters and malformed IP notations.
- **Credential Masking**: Confirms sensitive passwords are masked (`••••••`) in logs and UI.
- **Bulk Parsing**: Ingests mixed multi-line text, comments, CSV format, and JSON datasets.

### B. SSRF Protection & Address Sanitization (`tests/ssrf.test.ts`)
- **RFC 1918 Private Ranges**: Validates detection of `10.0.0.0/8`, `172.16.0.0/12`, and `192.168.0.0/16`.
- **Loopback & Metadata IPs**: Tests rejection of `127.0.0.1`, `169.254.169.254` (cloud metadata), and `0.0.0.0`.
- **Public IPs Allowed**: Verifies routable public addresses (e.g. `8.8.8.8`, `1.1.1.1`) pass security inspection.
- **IPv6 Security**: Identifies loopback `::1`, unique local `fc00::/7`, and link-local `fe80::/10`.
- **Internal Network Override**: Verifies operator authorization gate for intranet monitoring.

### C. Monitoring Transitions, Backoff & Quarantine (`tests/monitoring_transitions.test.ts`)
- **Inactive Record Retention**: Confirms inactive endpoints remain in the database with their failure reason preserved.
- **Recovery Detection (`INACTIVE -> ACTIVE`)**: Verifies that when a previously inactive proxy passes health checks:
  1. The status transitions to `ACTIVE`.
  2. A transition event is logged to `status_transitions`.
  3. `recovery_count` is incremented.
  4. An In-App / webhook notification is generated.
- **Zero Duplicate Alerts**: Confirms consecutive checks with unchanged status do not trigger duplicate transition notifications.
- **Bounded Exponential Backoff**: Validates backoff curve calculation ($base \times 1.5^{failures}$, capped at 24 hours) with jitter.
- **Automatic Quarantine**: Ensures records failing consecutive checks past the threshold are quarantined.
- **Quarantine Restoration**: Validates one-click recovery of quarantined records back into active inventory.
- **Endpoint Deduplication**: Verifies duplicate imports for the same owner update timestamps without creating redundant database records.
