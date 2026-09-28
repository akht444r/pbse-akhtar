# Court & Booking Platform (`pbse-akhtar`)

Platform-Based Software Engineering repository for the Court and Booking Service backend, API contracts, architectural decisions, authorization engines, and untrusted browser client.

- **Practice System:** Campus Sports and Padel Court Booking Platform
- **Contract Interface:** `spec/openapi.yaml`
- **API Base URL:** `http://localhost:3000`
- **Client Base URL:** `http://localhost:5173`

---

## Repository Overview

```text
pbse-akhtar/
├── .github/workflows/ci.yml        # GitHub Actions CI contract & security pipeline
├── client/                         # Vite + React Browser Client (Session 5)
│   ├── src/
│   │   ├── api/
│   │   │   └── client.js           # Centralized API layer, ETag cache & RFC 9457 parser
│   │   ├── components/
│   │   │   ├── BookingForm.jsx     # Court reservation form with field-level errors
│   │   │   ├── BookingList.jsx     # Active reservations & 412 OCC trigger
│   │   │   ├── PersonaSwitcher.jsx # Test persona credential manager
│   │   │   ├── ProblemBanner.jsx   # RFC 9457 error card renderer
│   │   │   └── ViewStateRenderer.jsx # Loading, Empty, Error, Content state handler
│   │   ├── context/
│   │   │   └── AuthContext.jsx     # Session persistence & identity context
│   │   ├── pages/                  # Routed application screens
│   │   ├── App.jsx                 # Routing skeleton and shell layout
│   │   ├── main.jsx                # Client application entry point
│   │   └── index.css               # Base Tailwind CSS rules
│   ├── package.json
│   └── vite.config.js
├── docs/decisions/                 # Architecture Decision Records (ADRs)
│   ├── 0001-record-decisions.md    # ADR 0001: ADR Tooling & Format
│   ├── 0002-implementasi.md        # ADR 0002: PostgreSQL & Service Engine
│   └── 0003-autentikasi.md         # ADR 0003: Three-Tier Access Control
├── evidence/                       # Test execution evidence & screenshots
│   └── PB-4/                       # Session 4 authorization & contract runs
├── openapi.yaml                    # Canonical OpenAPI 3.0.3 specification
├── service/                        # Express.js backend implementation
│   ├── dev-idp.js                  # Local mock JWKS identity provider server
│   ├── src/
│   │   ├── auth/                   # RS256 token verification & ownership guards
│   │   ├── routes/                 # Express route definitions
│   │   ├── store/                  # PostgreSQL query stores
│   │   └── app.js                  # Express middleware & CORS configuration
│   └── tests/                      # Node.js native contract & authorization test suites
└── spec/                           # Redocly linting & OpenAPI contract fixtures
```

---

## Web Application Client (Session 5)

The browser client is built as an untrusted consumer standing strictly on the Session 2 contract, Session 3 service, and Session 4 authentication rules. No private endpoints were added to ease frontend development.

### A.1 Scope of the Application & Workflows

| Workflow | Screen & Route | Role Permitted | Operation in `openapi.yaml` |
| --- | --- | --- | --- |
| **1. Explore Facilities** | Court Catalogue (`/`) | student (`courts:read`) | `GET /v1/courts` (1 call per screen, polled) |
|  | Court Detail (`/courts/:courtId`) | student (`courts:read`) | `GET /v1/courts/{courtId}` (1 call per screen, polled) |
| **2. Reserve Court Slot** | Booking Form (`/courts/:courtId/book`) | student (`bookings:write`) | `POST /v1/bookings` |
|  | Booking Confirmation (`/bookings/:bookingId`) | student (`bookings:read`) | `GET /v1/bookings/{bookingId}` |
| **3. Manage & Cancel** | Booking Detail (`/bookings/:bookingId`) | student (`bookings:write`) | `POST /v1/bookings/{bookingId}/cancellation` |

### A.3 Session Storage Architectural Decision

**Decision:** The application persists active authentication credentials, tokens, and test persona states in browser `localStorage` under the key `campus_court_session`.

**Trade-off & Threat Model Evaluation:**

- **Usability & Deep Linking:** Storing session tokens in `localStorage` allows users to open URLs in new tabs (A.2 item 1) or refresh mid-workflow without losing identity state or being redirected prematurely to sign-in.
- **Untrusted Environment Boundary:** The browser is fundamentally an untrusted environment. Storing raw JWT tokens in web storage makes them accessible to any script executing in the document origin, introducing risk in the event of an XSS vulnerability.
- **Mitigation & Production Pathway:** In production deployments, session tokens should transition to `HttpOnly`, `SameSite=Lax`, `Secure` cookies with server-side revocation endpoints to isolate credentials from client scripts. For this system, authorization boundaries remain fully defended on the server: backend Layer 1 (RS256 signature verification), Layer 2 (OAuth scope validation), and Layer 3 (ownership checks) prevent privilege escalation regardless of client-side tampering.

### A.4 Strict Cross-Origin Resource Sharing (CORS)

The backend Express service (`service/src/app.js`) enforces explicit origin matching against an authorized whitelist (`http://localhost:5173`, `http://127.0.0.1:5173`, `process.env.CLIENT_ORIGIN`):

- **No Wildcard Reflection:** Origin headers are never blindly reflected.
- **Cache Poisoning Defense:** Outgoing preflight and actual responses emit `Vary: Origin`.
- **Preflight Fast-Path:** All HTTP `OPTIONS` requests terminate immediately with `204 No Content` before reaching authentication or body parsers.
- **Exposed Headers:** `Access-Control-Expose-Headers` explicitly exposes `ETag` and `Location` so the client can track entity versions and newly created resource URIs.

### A.5 Four Fundamental View States

Every data-driven view explicitly handles four states without UI flashing:

1. **Loading:** Animated skeleton components reserve screen geometry while HTTP requests are in flight.
2. **Empty:** Displayed when an endpoint returns an empty array, prompting user action rather than leaving blank white space.
3. **Error:** Formatted RFC 9457 Problem Details rendered with human-readable titles, domain-specific details, and retry triggers.
4. **Content:** Successfully resolved domain data. Polled data reflects background update notices when stale.

### A.7 & A.8 Concurrency & Write Conflicts

- **Conditional Polling (`304 Not Modified`):** The centralized API client caches incoming `ETag` headers in memory. Background polling on resource collections sends `If-None-Match: <etag>`, allowing the server to answer `304 Not Modified` to prevent unnecessary re-rendering and bandwidth waste.
- **Optimistic Concurrency Control (`412 Precondition Failed`):** Mutating operations (such as cancellation) transmit `If-Match: <etag>`. If two browser windows attempt to cancel or modify the same booking concurrently, the lagging window receives `HTTP 412 Precondition Failed`. The client catches this refusal, prevents error banner spam, explains that another session updated the entity first, and automatically re-fetches the latest representation.

---

## Access Control Architecture (Session 4)

The backend enforces a strict **Three-Tier Access Checking Pipeline** adhering to OAuth 2.1 and RFC 7807/RFC 9457 Problem Details:

1. **Layer 1 — Authentication** (`service/src/auth/authenticate.js`, `verify.js`)
   - Asymmetric RS256 token verification using remote JWKS (`dev-idp.js` / Mock IdP).
   - Validates cryptographic signatures and standard claims (`exp`, `iss`, `aud`).
   - Non-compliant or tampered requests immediately return `401 Unauthorized` with `WWW-Authenticate: Bearer error="invalid_token"`.

2. **Layer 2 — Scope Enforcement** (`service/src/auth/require-scope.js`)
   - Compares the scopes in `req.principal.scopes` against the required operation capability before contacting persistence layers.
   - Missing scopes return `403 Forbidden` with `WWW-Authenticate: Bearer error="insufficient_scope"`.

3. **Layer 3 — Object Ownership & Tenant Isolation** (`service/src/auth/ownership.js`)
   - Enforced inside handlers where both the caller and database record are resolved.
   - Guarantees isolation across tenant boundaries (`facility_id`) and individual users (`reserved_by`).
   - **Identical 404 Rule:** Requests targeting non-existent entities or entities belonging to other callers return an identical `404 Not Found` response to prevent identifier enumeration.

---

## Test Suites & Verification

| Test Suite | Command | Status | Scope |
| --- | --- | --- | --- |
| **Contract Conformance** | `npm run test:contract` | **PASS (4/4)** | Verifies `/health`, `/v1/courts`, and `/v1/bookings` against `openapi.yaml`. |
| **Authorization & Security** | `npm run test:authz` | **PASS (5/5)** | Verifies Layer 1 (401), Layer 2 (403), Layer 3 isolation (404), and tenant boundaries (404). |

---

## Live Demonstration Sequence (Session 7 Evaluation)

To run the full stack locally for presentation:

1. **Terminal 1 (Mock IdP Server):**
   ```powershell
   cd service
   node dev-idp.js
   ```

2. **Terminal 2 (Express Backend API):**
   ```powershell
   cd service
   npm start
   ```

3. **Terminal 3 (Vite Browser Client):**
   ```powershell
   cd client
   npm run dev
   ```

### Evaluation Rubric Mapping

| # | Grader Action | System & Client Behaviour |
| --- | --- | --- |
| 1 | Open URL without signing in | The catalogue's first request is answered 401 (it needs `courts:read`), so the app sends the visitor to `/login` with `returnTo` preserved and returns them to the catalogue after sign-in. |
| 2 | Sign in as Student A & complete workflow | Complete end-to-end court reservation with skeleton loading; state persists after browser reload. |
| 3 | Deep-link / open URL in new tab mid-workflow | Exact view loads with identical entity data using route parameters rather than returning to start. |
| 4 | Submit form with missing/invalid inputs | Client catches 400/422 and renders RFC 9457 field-level error messages directly under the input. |
| 5 | Two windows perform concurrent write | Second window encounters `412 Precondition Failed`, explains conflict in domain terms, and refreshes data. |
| 6 | Execute unauthorized console attack | Running unpermitted `fetch()` via DevTools console returns `403 Forbidden` or `404 Not Found` from the service. |

---

## Release Tags

- **`L3` / `l3`**: Session 3 completion — baseline backend service, database migrations, and initial contract conformance.
- **`L4` / `l4`**: Session 4 completion — OAuth 2.1 security schemes, three-tier access control, identical 404 protection, and full test suite passing.
- **`L5` / `l5`**: Session 5 completion — browser web application, centralized API client, strict CORS, four view states, conditional polling, and optimistic concurrency control.

---

## Architectural Decision Records

All core technical decisions are documented under `docs/decisions/`:

- [0001: Record Architecture Decisions](docs/decisions/0001-record-decisions.md)
- [0002: Service Implementation & Persistence](docs/decisions/0002-implementasi.md)
- [0003: Authentication & Access Control](docs/decisions/0003-autentikasi.md)