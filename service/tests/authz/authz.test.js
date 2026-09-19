import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { setupMockIdp, teardownMockIdp, issueMockToken } from '../helpers/tokens.js';

const BASE_URL = process.env.SERVICE_URL || 'http://localhost:3000';

describe('Session 4: Access Control & Authorization Suite', () => {
  before(async () => {
    // Spin up the in-memory mock JWKS server on port 9999
    await setupMockIdp(9999);
  });

  after(async () => {
    // Tear down mock server after tests finish
    await teardownMockIdp();
  });

  // ========================================================
  // TRACK 1 (Auth Engine): Layer 1 Token Verification
  // ========================================================
  it('Layer 1: request with a tampered token signature returns 401', async () => {
    const validToken = await issueMockToken({ subject: 'student-a' });
    const tamperedToken = validToken.slice(0, -6) + 'xxxxxx';

    const res = await fetch(`${BASE_URL}/v1/courts`, {
      headers: { Authorization: `Bearer ${tamperedToken}` },
    });

    assert.equal(res.status, 401);
    assert.match(res.headers.get('content-type') || '', /application\/problem\+json/);
    assert.match(res.headers.get('www-authenticate') || '', /invalid_token/);

    const body = await res.json();
    assert.equal(body.status, 401);
  });

  // ========================================================
  // TRACK 2: Place Negative Tests 1 & 2 below
  // (e.g., Object ID scoping / cross-tenant court checks -> identical 404)
  // ========================================================

  // ========================================================
  // TRACK 3: Place Negative Tests 3 & 4 below
  // (e.g., Missing scope check -> 403 & facility mismatch -> 404)
  // ========================================================
});