# Changelog

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
