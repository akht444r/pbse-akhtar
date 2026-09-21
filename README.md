# PBSE
Practice system: Campus Sports and Padel Court Booking API
Interface: spec/openapi.yaml
Run the mock: cd spec && npm install && npm run mock

# Court & Booking Platform (`pbse-akhtar`)

Platform-Based Software Engineering repository for the Court and Booking Service backend, API contracts, architectural decisions, and authorization engines.

## Repository Overview

```text
pbse-akhtar/
├── .github/workflows/ci.yml       # GitHub Actions CI pipeline
├── docs/decisions/                # Architecture Decision Records (ADRs)
│   ├── 0001-record-decisions.md   # ADR 0001: ADR Tooling & Format
│   ├── 0002-implementasi.md       # ADR 0002: PostgreSQL & Service Engine
│   └── 0003-autentikasi.md        # ADR 0003: Three-Tier Access Control
├── evidence/                      # Test execution & verification evidence
│   └── PB-4/                      # Session 4 test execution screenshots
├── openapi.yaml                   # Canonical OpenAPI 3.0.3 specification
├── service/                       # Express.js backend implementation
└── spec/                          # OpenAPI tooling, mock server & schemas
```

---

## Access Control Architecture (Session 4)

The backend enforces a strict **Three-Tier Access Checking Pipeline** adhering to OAuth 2.1 and RFC 7807 Problem Details[cite: 2]:

1. **Layer 1 — Authentication (`service/src/auth/authenticate.js`, `verify.js`)**:
   - Asymmetric RS256 token verification using remote JWKS[cite: 2].
   - Validates cryptographic signatures and standard claims (`exp`, `iss`, `aud`)[cite: 2].
   - Non-compliant or tampered requests immediately return `401 Unauthorized` with `WWW-Authenticate: Bearer error="invalid_token"`[cite: 2].

2. **Layer 2 — Scope Enforcement (`service/src/auth/require-scope.js`)**:
   - Compares the scopes in `req.principal.scopes` against the required operation capability before contacting persistence layers[cite: 2].
   - Missing scopes return `403 Forbidden` with `WWW-Authenticate: Bearer error="insufficient_scope"`[cite: 2].

3. **Layer 3 — Object Ownership & Tenant Isolation (`service/src/auth/ownership.js`)**:
   - Enforced inside handlers where both the caller and database record are resolved[cite: 2].
   - Guarantees isolation across tenant boundaries (`facility_id`) and individual users (`reserved_by`)[cite: 2].
   - **Identical 404 Rule**: Requests targeting non-existent entities or entities belonging to other callers return an identical `404 Not Found` response to prevent identifier enumeration[cite: 2].

---

## Test Suites & Verification

The service maintains 100% green coverage across all contract and security suites:

| Test Suite | Target | Status | Scope |
| :--- | :--- | :---: | :--- |
| **Contract Conformance** | `npm run test:contract` | **PASS (4/4)** | Verifies `/health`, `/v1/courts`, and `/v1/bookings` against `openapi.yaml`[cite: 2]. |
| **Authorization & Security** | `npm run test:authz` | **PASS (5/5)** | Verifies Layer 1 (401), Layer 2 (403), Layer 3 isolation (404), and tenant boundaries (404)[cite: 2]. |

---

## Release Tags

- **`13` / `l3`**: Session 3 completion — baseline backend service, database migrations, and initial contract conformance[cite: 2].
- **`14`**: Session 4 completion — OAuth 2.1 security schemes, three-tier access control, identical 404 protection, and full test suite passing[cite: 2].

---

## Architectural Decision Records

All core technical decisions are documented under `docs/decisions/`:
- [0001: Record Architecture Decisions](docs/decisions/0001-record-architecture-decisions.md)
- [0002: Service Implementation & Persistence](docs/decisions/0002-implementasi.md)
- [0003: Authentication & Access Control](docs/decisions/0003-autentikasi.md)[cite: 2]