# 2. Service Implementation and Storage Architecture

## Context
Lab 3 requires transitioning from the Session 2 mock server to a real service backed by durable storage, server-side idempotency, and an RFC 9457 Problem Details error model.

## Decision
- **Hosting Provider:** Render Web Services for containerized Node.js execution.
- **Database:** Managed serverless PostgreSQL (Neon) to persist entities across service restarts.
- **Idempotency Storage:** Dedicated `idempotency_keys` table storing the UUID key, SHA-256 body hash, and cached response payload.
- **Error Handling:** RFC 9457 Problem Details standard via a centralized `problem.js` helper.

## Alternatives Considered
- In-memory `Map` storage (rejected: does not survive service restarts or platform redeployments).
- Redis for idempotency (rejected: PostgreSQL avoids managing an extra infrastructure dependency).

## Consequences
- Single-command database setup via `schema.sql`.
- Restart-safe persistence satisfying all Lab 3 criteria.