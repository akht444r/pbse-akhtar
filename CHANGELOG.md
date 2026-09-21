# Changelog

## 1.0.0 — 2026-09-20

### Changed — BREAKING
- All `/v1/**` operations now require an access token carrying the scope
  stated on that operation. Requests without a token are answered `401`.
  Reason: Session 3 deliberately had no authentication; user and booking
  data must not be served without checking the caller.

### Added
- `components.securitySchemes.oauth2` with four scopes: `courts:read`,
  `courts:manage`, `bookings:read`, `bookings:write`.
- `401` and `403` responses on every protected operation.
- `GET /bookings/{bookingId}` and `POST /bookings/{bookingId}/cancellation`
  — required so object-level ownership (Session 4 Layer 3) has something
  to protect. Both document that "does not exist" and "not yours" answer
  identically with `404`.

## 0.2.0 — 2026-09-08

### Added
- `GET /courts/{courtId}` — fetch a single court by its identifier. Required
  for L3's read-a-single-entity implementation (A.4). Purely additive: no
  existing operation's request or response shape changed.
- A documented `400` response on `GET /courts`, for an invalid `isAvailable`
  query value. The service already needed to produce this; it was missing
  from the contract.

### Notes
This is a minor version bump: both changes are additive and do not break
any client already built against 0.1.0.
