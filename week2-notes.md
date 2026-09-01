# Week 2 Notes & Checkpoints

## Checkpoints

### Checkpoint 1: Screen Endpoints vs Resources
- Screen-shaped endpoint: `GET /court-dashboard`
- Real resources: 
  1. `GET /courts` (court metadata, type, availability status)
  2. `GET /bookings?userId={id}` (active reservations for the user)
  3. `GET /announcements` (campus sports facility notices)

### Checkpoint 2: Status Change Endpoints
- Resource-based address: `POST /bookings/{id}/cancellation`
- Verb version: `POST /cancelBooking/{id}`
- Reason: The verb version cannot carry cancellation metadata (such as reason code or refund claim), cannot return a distinct timestamped cancellation resource, and forces an RPC-style architecture instead of REST.

### Checkpoint 3: Network Drop & Safe to Repeat
- `GET /courts` -> Safe to repeat; client loses nothing on retry.
- `POST /bookings` -> Unsafe to repeat without protection. If retried upon connection timeout, the user risks double-booking slots or incurring multiple debit charges. Requires an `Idempotency-Key` header.

---

## Self-Check Answers

1. POST /v1/orders/{id}/markReady Rejection:
   - Reason 1: Uses an action verb (`markReady`) in the URI path instead of a resource noun, violating REST conventions.
   - Reason 2: Prevents passing a structured request/response body (e.g., preparation timestamp, staff ID) or querying past transitions via standard GET.
   - Better address: `POST /v1/orders/{id}/readiness`

2. PUT /v1/menu-items/itm_3Bn Retry:
   - Is it read-only? No, because it mutates the server's resource state.
   - Is it safe to repeat (idempotent)? Yes, because replacing the complete target resource with the identical payload multiple times leaves the system in the exact same state as applying it once.

3. Item Sold Out Handling:
   - Status code: `409 Conflict` (or `422 Unprocessable Entity`), belonging to domain rejection (business rule said no).
   - Why not 500? 500 signals an internal server crash, causing clients to endlessly retry a request that can never succeed and cluttering server health alerts.
   - Why not 200? 200 masquerades failure as success, breaking HTTP caching and middleware, and forcing every client to inspect inner response bodies manually.

4. Dangerous Operation in Campus Court Booking:
   - Operation: `POST /bookings`
   - Network drop impact: The user risks paying twice and booking conflicting consecutive time slots.
   - The Four Sentences:
     1. Header name: `Idempotency-Key`, a version-4 UUID with hyphens.
     2. Required operations: Required on `POST /bookings`; ignored on read endpoints.
     3. Retention duration: Keys are kept for 24 hours; retries after 24 hours are treated as new requests.
     4. Key reuse with different payload: Returns `409 Conflict` with Problem type `.../problems/idempotency-key-reuse`.

5. One Thing Unsure About:
   - How should the server reconcile race conditions when two different clients submit different idempotency keys for the exact same physical court slot before either transaction finishes writing?

---

## Where I Stand
- Self-Mark: **PASS**
- Justification: All five lab conditions are met, the specification lints clean with zero errors, example payloads are defined across all schemas, the missing-header 422 refusal screenshot is documented in `evidence/`, the idempotency ticket contract is documented, and no backend service code was written before to the specification contract.
