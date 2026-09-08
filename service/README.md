# Court Booking Service

## Operations

| Operation | Served by | Remaining work |
|---|---|---|
| `GET /v1/courts` | service | — |
| `GET /v1/courts/{courtId}` | service | — (contract updated in 0.2.0, see CHANGELOG.md) |
| `POST /v1/bookings` | service | — |
| `GET /v1/bookings/{bookingId}` | not built | out of scope for this round |

## Error catalogue

Every failure is produced by `problem.js`, using `application/problem+json`.

| Cause in the handler | Status | `type` slug | Client action |
|---|---|---|---|
| `Idempotency-Key` header missing or not a UUID | 400 | `invalid-request-body` | Fix the header |
| `courtId` path param doesn't match `^crt_[A-Za-z0-9]{4,}$` | 400 | `invalid-identifier` | Construct a valid URL |
| `isAvailable` query value isn't `true`/`false` | 400 | `invalid-request-body` | Fix the query string |
| Booking body fails validation (bad courtId/dates) | 400 | `invalid-request-body` | Correct the fields |
| No court exists for the given `courtId` (path) | 404 | `court-not-found` | Refresh the court list or remove the stale link |
| Booking references a `courtId` that doesn't exist | 422 | `unknown-court` | Choose a court that currently exists |
| Court is flagged `isAvailable: false` | 409 | `court-unavailable` | Choose a different court/time |
| Requested slot overlaps an existing booking on that court | 409 | `court-unavailable` | Choose a different time |
| Same `Idempotency-Key` reused with a different body | 409 | `idempotency-key-reuse` | Resend the original body, or use a new key for new work |
| Anything unplanned | 500 | `internal-error` | Retry safely; report the `instance` if it continues |

## Known gaps / assumptions (flag with the team)

- `reservedBy` is accepted as an optional field in `POST /bookings`'s body,
  defaulting to `"usr_anonymous"` when omitted. The contract's `NewBooking`
  schema doesn't declare it, and there's no authentication yet (Session 3
  rule 0.5) to derive a real user identity from. This needs a proper fix
  once auth lands in Meeting 4 — probably deriving `reservedBy` from the
  authenticated token instead of the request body.
- Overlap detection on `POST /bookings` is not explicitly required by the
  contract, but was added because a booking system without it would let
  two students book the same court at the same time. Worth confirming with
  the team that this business rule is correct.
