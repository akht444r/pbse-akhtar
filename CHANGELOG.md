# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 1.0.0 — 2026-09-21

### Changed — BREAKING
- All `/v1/**` operations now require an access token carrying the scope stated on that operation[cite: 2]. Requests without a valid token are answered `401 Unauthorized`[cite: 2].
  Reason: Session 3 deliberately had no authentication; user and booking data must not be served without checking the caller[cite: 2].

### Added
- `components.securitySchemes.oauth2` declared on the OpenAPI contract supporting Authorization Code with PKCE and Client Credentials flows[cite: 2].
- Scope vocabulary defining `courts:read`, `courts:manage`, `bookings:read`, and `bookings:write`[cite: 2].
- Documented `401 Unauthorized` and `403 Forbidden` RFC 7807 Problem Details responses with `WWW-Authenticate` headers on every protected operation[cite: 2].
- `GET /v1/bookings/{bookingId}` and `POST /v1/bookings/{bookingId}/cancellation` endpoints to support Layer 3 object-level ownership enforcement[cite: 2].
- Three-tier authorization pipeline under `service/src/auth/`[cite: 2]:
  - **Layer 1** (`verify.js`, `authenticate.js`): Cryptographic RS256 token verification against remote JWKS and normalized `req.principal` construction[cite: 2].
  - **Layer 2** (`require-scope.js`): Scope validation middleware returning `403 Forbidden` (`insufficient_scope`) before touching database entities[cite: 2].
  - **Layer 3** (`ownership.js`): Handler-level ownership and facility tenant boundary checks[cite: 2].
- Automated negative authorization test suite (`tests/authz/authz.test.js`) verifying token signature tampering (`401`), cross-user booking reads (`404`), cross-user booking cancellations (`404`), missing scope access (`403`), and cross-facility isolation (`404`)[cite: 2].

### Fixed
- Synchronized database schema for the `bookings` relation: added `slot_start` and `slot_end` timestamp columns to eliminate query execution crashes on booking creation.
- Updated `tests/contract/contract.test.js` to issue authenticated mock tokens with `courts:read` and `bookings:write` scopes, keeping Session 3 conformance tests green alongside active Layer 1 middleware[cite: 2].

### Security
- Identical `404 Not Found` responses: non-existent objects and objects owned by other callers return identical Problem Details payloads and headers to prevent identifier enumeration attacks[cite: 2].
- Token logging redaction: configured logger boundary redaction for `req.headers.authorization` and cookie headers to ensure bearer tokens are never leaked to logs[cite: 2].
- Mutation guard: booking cancellation checks object ownership before any database status mutation occurs[cite: 2].

## 0.3.0 — 2026-09-14

### Added
- Baseline backend service implementation matching Session 2 API contracts[cite: 2].
- PostgreSQL database persistence layer with connection pooling and schema migrations (`courts`, `bookings`, `idempotency_keys`).
- Core contract conformance test suite (`tests/contract/contract.test.js`)[cite: 2].
- ACID transaction handling and deterministic idempotency storage (`Idempotency-Key` header).
- Initial court listing and booking reservation logic.

## 0.2.0 — 2026-09-08

### Added
- `GET /courts/{courtId}` — fetch a single court by its identifier. Required for L3's read-a-single-entity implementation (A.4). Purely additive: no existing operation's request or response shape changed.
- A documented `400` response on `GET /courts`, for an invalid `isAvailable` query value. The service already needed to produce this; it was missing from the contract.

### Notes
This is a minor version bump: both changes are additive and do not break any client already built against 0.1.0.