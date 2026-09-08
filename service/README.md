# Campus Court Booking Service

## Deployment
- **Live Service URL:** `https://court-bookings-pbse.onrender.com`
- **Health Check:** `https://court-bookings-pbse.onrender.com/health`

---

## Operations Status Table (Section A.3)

| Operation | Method & Path | Served by | Remaining Work |
| :--- | :--- | :--- | :--- |
| Get Court Details | `GET /v1/courts/{courtId}` | service | Completed |
| List Courts | `GET /v1/courts` | service | Completed |
| Create Booking | `POST /v1/bookings` | service | Completed |
| Get Booking Details | `GET /v1/bookings/{bookingId}` | service | Completed |

---

## Failure Mapping Table (Section A.6)

All error responses strictly follow the RFC 9457 Problem Details format with `Content-Type: application/problem+json`.

| Cause inside Handler | HTTP Status | Type URI |
| :--- | :--- | :--- |
| Missing or malformed `Idempotency-Key` header | 400 | `https://api.campuscourt.local/errors/missing-idempotency-key` |
| Malformed UUID parameter or invalid query param | 400 | `https://api.campuscourt.local/errors/invalid-request` |
| Request body fields failed schema validation | 400 | `https://api.campuscourt.local/errors/validation-failed` |
| Court or booking resource does not exist | 404 | `https://api.campuscourt.local/errors/resource-not-found` |
| Court already booked / slot unavailable | 409 | `https://api.campuscourt.local/errors/court-conflict` |
| Idempotency key reused with different request body | 409 | `https://api.campuscourt.local/errors/idempotency-key-reuse` |
| Referenced court ID not found during booking | 422 | `https://api.campuscourt.local/errors/unprocessable-entity` |
| Unhandled exception or unexpected database error | 500 | `https://api.campuscourt.local/errors/internal-server-error` |