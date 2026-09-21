# 0003. Authentication and Three-Tier Access Control

* Status: Accepted
* Date: 2026-09-21
* Deciders: Group Unit (Session 4)

## Context

The Court and Booking backend service from Session 3 was deliberately implemented without authentication to establish baseline contract conformance[cite: 2]. Operating without access control creates critical security vulnerabilities:
1. **Insecure Direct Object References (IDOR)**: Any caller can inspect or cancel reservations belonging to other users simply by changing the `bookingId` path parameter[cite: 2].
2. **Untrusted Caller Identity**: The caller cannot be authenticated, allowing arbitrary spoofing of the `reservedBy` parameter if accepted from the request body[cite: 2].
3. **Identifier Enumeration**: Differentiating responses between "does not exist" and "not yours" (e.g., returning 403 instead of 404) leaks the existence of sensitive IDs to attackers scanning the ID space[cite: 2].

The system requires an authorization architecture conforming to OAuth 2.1 and RFC 7807 (Problem Details), strictly separating authentication ("who is calling") from authorization ("what the caller is permitted to access")[cite: 2].

---

## Decision

### 1. Client Classification (Step 1)
Every client requesting tokens is categorized strictly by whether it can keep credentials confidential[cite: 2]:

| Client | Execution Environment | Client Type | OAuth 2.1 Flow | Client Secret? |
| :--- | :--- | :--- | :--- | :--- |
| **Web SPA (Session 5)** | User Browser (V8/JavaScript) | Public | Authorization Code + PKCE | **No**[cite: 2] |
| **Mobile App (Session 6)** | End-user Mobile Device (iOS/Android) | Public | Authorization Code + PKCE | **No**[cite: 2] |
| **Reconciliation Job** | Backend Infrastructure / Cron Runner | Confidential | Client Credentials | **Yes** (in vault/env)[cite: 2] |

*Public Client Security Rule*: Public clients cannot securely protect credentials[cite: 2]. Obfuscating or embedding a secret in client-side code is strictly prohibited[cite: 2]. All public clients must use the Authorization Code flow with Proof Key for Code Exchange (PKCE S256) and cryptographically random `state` parameters[cite: 2].

---

### 2. Scope Vocabulary (Step 2)
Scopes are designed around discrete actor domain capabilities (`resource:action`) rather than a 1:1 mapping to HTTP endpoints[cite: 2]:

| Scope | Capability Granted | Student / Member | Staff / Admin | Reconciliation Job |
| :--- | :--- | :---: | :---: | :---: |
| `courts:read` | Inspect courts and schedules within facility[cite: 2] | Yes[cite: 2] | Yes[cite: 2] | Yes[cite: 2] |
| `courts:manage` | Create, update, and manage court inventory[cite: 2] | No[cite: 2] | Yes[cite: 2] | No[cite: 2] |
| `bookings:read` | Read booking representations permitted to caller[cite: 2] | Yes[cite: 2] | Yes[cite: 2] | No[cite: 2] |
| `bookings:write` | Create bookings and cancel own reservations[cite: 2] | Yes[cite: 2] | No[cite: 2] | No[cite: 2] |
| `bookings:manage` | Manage and reassign bookings across the facility[cite: 2] | No[cite: 2] | Yes[cite: 2] | No[cite: 2] |
| `reports:read` | Read system metrics and financial reconciliation[cite: 2] | No[cite: 2] | No[cite: 2] | Yes[cite: 2] |

---

### 3. Three-Tier Access Checking Pipeline
Access checks are executed sequentially in three separate layers rather than merged into a single conditional block[cite: 2]:

1. **Layer 1 — Authentication (`service/src/auth/authenticate.js`, `verify.js`)**:
   * Validates the bearer token using remote JSON Web Key Sets (JWKS) via RS256 asymmetric signature verification[cite: 2].
   * Verifies standard claims: expiration (`exp`), issuer (`iss`), and audience (`aud`)[cite: 2].
   * Constructs `req.principal = { subject, scopes, facilityId }`[cite: 2].
   * *Failure*: Emits `401 Unauthorized` with `WWW-Authenticate: Bearer error="invalid_token"`[cite: 2].

2. **Layer 2 — Scope Enforcement (`service/src/auth/require-scope.js`)**:
   * Inspects `req.principal.scopes` against the required operation scope before any database operation executes[cite: 2].
   * *Failure*: Emits `403 Forbidden` with `WWW-Authenticate: Bearer error="insufficient_scope"`[cite: 2].

3. **Layer 3 — Object Ownership & Tenant Isolation (`service/src/auth/ownership.js`)**:
   * Enforced inside route handlers where both the caller's identity and the fetched database record are known[cite: 2].
   * Ensures bookings belong to the caller (`booking.reserved_by === req.principal.subject`) and courts belong to the caller's tenant facility (`court.facility_id === req.principal.facilityId`)[cite: 2].
   * *Identical 404 Guarantee*: If a record does not exist OR belongs to another user/facility, the service returns an identical `404 Not Found` Problem Details response to prevent ID enumeration[cite: 2].

---

### 4. Test Token Strategy (Step 11a)
To prevent network flakiness and maintain fast, isolated CI pipelines without external IdP dependencies, automated test suites utilize a local in-memory JWKS mock identity server (`service/tests/helpers/tokens.js`) running on port `9999`[cite: 2].

---

### 5. Refresh Token Rotation & Reuse Detection Evidence (Step 10b)
Refresh token rotation with automated reuse detection is enforced on the authorization server[cite: 2]:
* **Configuration**: `Revoke Refresh Token: ON`, `Refresh Token Max Reuse: 0`[cite: 2].
* **Execution Evidence**:

```bash
# 1. First refresh exchange: RT1 yields a fresh RT2 (RT1 != RT2)
$ RT2=$(curl -s -X POST "$ISSUER/protocol/openid-connect/token" \
    -d grant_type=refresh_token \
    -d client_id=web \
    -d refresh_token="$RT1" | jq -r .refresh_token)
$ [ "$RT1" != "$RT2" ] && echo "rotation is working"
rotation is working

# 2. Replaying stale RT1 is rejected by the server
$ curl -s -X POST "$ISSUER/protocol/openid-connect/token" \
    -d grant_type=refresh_token \
    -d client_id=web \
    -d refresh_token="$RT1" | jq .error
"invalid_grant"

# 3. Invalidating the entire token family upon reuse detection (RT2 is now revoked)
$ curl -s -X POST "$ISSUER/protocol/openid-connect/token" \
    -d grant_type=refresh_token \
    -d client_id=web \
    -d refresh_token="$RT2" | jq .error
"invalid_grant"
```

---

## Alternatives Considered

1. **Combining Authentication and Scope Checks into a Single Middleware**:
   * *Rejected*: Mixing identity verification and scope evaluation creates tight coupling, prevents isolated unit testing, and breaks single-responsibility design[cite: 2].

2. **Returning `403 Forbidden` for Foreign Bookings**:
   * *Rejected*: Returning 403 when an ID exists and 404 when it does not allows attackers to probe and enumerate valid IDs[cite: 2].

3. **Storing Refresh Tokens in Browser LocalStorage**:
   * *Rejected*: Vulnerable to Cross-Site Scripting (XSS) extraction. Tokens are restricted to in-memory state or `HttpOnly`, `Secure`, `SameSite=Strict` cookies.

---

## Consequences

### Positive
* Complete mitigation of IDOR vulnerabilities on booking reads and cancellations[cite: 2].
* Complete defense against identifier enumeration via uniform 404 responses[cite: 2].
* Fully automated CI testing isolated from external authorization servers[cite: 2].
* Sanitized application logging preventing token credential leaks[cite: 2].

### Negative & Mitigations
* Pre-existing Session 3 contract tests require authenticated tokens with matching scopes (`courts:read`, `bookings:write`) to pass through the active Layer 1 middleware[cite: 2].