# Campus Court Booking Service

## Deployment
- **Live Service URL:** `https://court-bookings-pbse.onrender.com`
- **Health Check:** `https://court-bookings-pbse.onrender.com/health`

---

## 1. Operations Status Table (Section A.3)

Updated to reflect Session 4 completion: all core resources, authentication layers, and object ownership handlers are implemented[cite: 2].

| Operation | Method & Path | Security Scope | Status | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Health Check** | `GET /health` | *Public (None)* | Completed | Service liveness probe. |
| **List Courts** | `GET /v1/courts` | `courts:read` | Completed | Tenant-scoped list matching caller's facility. |
| **Get Court Details** | `GET /v1/courts/{courtId}` | `courts:read` | Completed | Enforces cross-facility boundary check (404 on mismatch)[cite: 2]. |
| **Create Booking** | `POST /v1/bookings` | `bookings:write` | Completed | Idempotency-Key validated; `reserved_by` locked to token subject. |
| **Get Booking Details** | `GET /v1/bookings/{bookingId}` | `bookings:read` | Completed | Layer 3 object ownership check; returns identical 404 for foreign IDs[cite: 2]. |
| **Cancel Booking** | `POST /v1/bookings/{bookingId}/cancellation` | `bookings:write` | Completed | Ownership verified before mutation; invalid transitions return 409[cite: 2]. |

---

## 2. Scope Vocabulary (Step 2)

All token permissions are governed by discrete domain capabilities formatted as `resource:action`[cite: 2]:

| Scope | Capability Granted | Student / User | Staff / Admin | Reconciliation Job |
| :--- | :--- | :---: | :---: | :---: |
| `courts:read` | Browse courts and inspect schedules within facility[cite: 2] | Yes[cite: 2] | Yes[cite: 2] | Yes[cite: 2] |
| `courts:manage` | Manage court inventory and toggle availability[cite: 2] | No[cite: 2] | Yes[cite: 2] | No[cite: 2] |
| `bookings:read` | Read booking representations accessible to caller[cite: 2] | Yes[cite: 2] | Yes[cite: 2] | No[cite: 2] |
| `bookings:write` | Create reservations and cancel own bookings[cite: 2] | Yes[cite: 2] | No[cite: 2] | No[cite: 2] |
| `bookings:manage` | Manage bookings across the facility[cite: 2] | No[cite: 2] | Yes[cite: 2] | No[cite: 2] |
| `reports:read` | Access reconciliation and system metric reports[cite: 2] | No[cite: 2] | No[cite: 2] | Yes[cite: 2] |

---

## 3. Object Ownership Rules Inventory (Step 8a)

Handlers resolving named objects execute explicit Layer 3 predicates before returning data or committing mutations[cite: 2]:

| Operation | Object | Layer 3 Ownership Predicate |
| :--- | :--- | :--- |
| `GET /v1/courts` | Collection | Filtered directly in SQL query (`facility_id = req.principal.facilityId`). |
| `GET /v1/courts/{courtId}` | `court` | Caller facility must match court facility (`court.facility_id === req.principal.facilityId`). Foreign facility returns identical `404`[cite: 2]. |
| `POST /v1/bookings` | `booking` | Associated court must belong to caller's facility. Reservation subject is locked to `req.principal.subject`. |
| `GET /v1/bookings/{bookingId}` | `booking` | Caller must own the booking (`booking.reserved_by === req.principal.subject`) or hold staff scope[cite: 2]. Foreign bookings return identical `404`[cite: 2]. |
| `POST /v1/bookings/{bookingId}/cancellation` | `booking` | Caller must own the booking (`booking.reserved_by === req.principal.subject`). Checked **prior** to running cancellation SQL[cite: 2]. Foreign bookings return identical `404`[cite: 2]. |

---

## 4. Failure Mapping Table (Section A.6 & Session 4 Security)

All error responses strictly follow the RFC 7807 / RFC 9457 Problem Details format (`Content-Type: application/problem+json`)[cite: 2].

| Cause inside Handler | HTTP Status | Type URI / Error Code | Header / Security Note |
| :--- | :---: | :--- | :--- |
| Missing, expired, or tampered token | **401** | `invalid_token` | `WWW-Authenticate: Bearer error="invalid_token"`[cite: 2] |
| Valid token lacks required scope | **403** | `insufficient_scope` | `WWW-Authenticate: Bearer error="insufficient_scope"`[cite: 2] |
| Resource does not exist | **404** | `booking-not-found` / `resource-not-found` | Standard resource absence response[cite: 2]. |
| Resource owned by another caller / facility | **404** | `booking-not-found` / `court-not-found` | **Identical 404**: Payload and shape match non-existent resources to stop ID harvesting[cite: 2]. |
| Missing or malformed `Idempotency-Key` | **400** | `invalid-request-header` | Expected valid UUID format. |
| Invalid identifier format (e.g. invalid court/booking ID) | **400** | `invalid-identifier` | Identifier pattern mismatch. |
| Request body validation failure | **422** | `invalid-request-body` | Schema constraint violation. |
| Unknown court ID referenced during booking | **422** | `unknown-court` | Foreign key reference violation (`23503`). |
| Schedule overlap / court unavailable | **409** | `court-unavailable` | Time conflict or court marked unavailable. |
| Idempotency key reused with mismatched body | **409** | `idempotency-key-reuse` | Hash mismatch on existing idempotency key. |
| Illegal booking status transition | **409** | `illegal-transition` | E.g. attempting to cancel an already completed/rejected booking. |
| Internal server or unhandled database error | **500** | `internal-server-error` | Generic server error. |

---

## 5. Local Development & Verification

### Running the Service
```bash
# Start server locally
npm start
```

### Running the Test Suites
```bash
# Run Session 4 Access Control & Authorization Suite (5/5 tests)
npm run test:authz

# Run Session 3/4 Contract Conformance Suite (4/4 tests)
npm run test:contract
```

### Log Redaction Verification (Step 9)
Verify that authorization bearer tokens are not leaked into system logs[cite: 2]:
```bash
grep -RniE 'bearer ey|[A-Za-z0-9_-]{10,}' logs/ 2>/dev/null && echo "STILL LEAKING" || echo "clean"
```