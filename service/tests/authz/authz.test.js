import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
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
  it('Test 1: Student A reading Student B\'s booking returns 404', async () => {
    const tokenB = await issueMockToken({ subject: 'student-b', scopes: ['bookings:write'] });
    const createRes = await fetch(`${BASE_URL}/v1/bookings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenB}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': crypto.randomUUID(),
      },
      body: JSON.stringify({
        courtId: 'crt_Padel01',
        slotStart: '2027-01-10T14:00:00+07:00',
        slotEnd: '2027-01-10T15:00:00+07:00',
      }),
    });
    assert.equal(createRes.status, 201, 'setup: booking for student-b must be created');
    const booking = await createRes.json();

    const tokenA = await issueMockToken({ subject: 'student-a', scopes: ['bookings:read'] });
    const res = await fetch(`${BASE_URL}/v1/bookings/${booking.id}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.equal(res.status, 404);
    assert.match(res.headers.get('content-type') || '', /application\/problem\+json/);
    const body = await res.json();
    assert.equal(body.status, 404);

    // The same 404 shape as a genuinely non-existent booking -- proves
    // "not yours" cannot be told apart from "does not exist".
    const notFoundRes = await fetch(`${BASE_URL}/v1/bookings/bkg_doesnotexist`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const notFoundBody = await notFoundRes.json();
    assert.equal(notFoundRes.status, res.status);
    assert.equal(notFoundBody.type, body.type);
    assert.equal(notFoundBody.title, body.title);
  });

  it('Test 2: Student A cancelling Student B\'s booking returns 404 and changes nothing', async () => {
    const tokenB = await issueMockToken({ subject: 'student-b', scopes: ['bookings:write', 'bookings:read'] });
    const createRes = await fetch(`${BASE_URL}/v1/bookings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenB}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': crypto.randomUUID(),
      },
      body: JSON.stringify({
        courtId: 'crt_Padel02',
        slotStart: '2027-01-11T09:00:00+07:00',
        slotEnd: '2027-01-11T10:00:00+07:00',
      }),
    });
    assert.equal(createRes.status, 201, 'setup: booking for student-b must be created');
    const booking = await createRes.json();

    const tokenA = await issueMockToken({ subject: 'student-a', scopes: ['bookings:write'] });
    const res = await fetch(`${BASE_URL}/v1/bookings/${booking.id}/cancellation`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.equal(res.status, 404);
    assert.match(res.headers.get('content-type') || '', /application\/problem\+json/);

    // Prove nothing actually changed: student-b can still see it as confirmed.
    const checkRes = await fetch(`${BASE_URL}/v1/bookings/${booking.id}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const checkBody = await checkRes.json();
    assert.equal(checkBody.status, 'confirmed');
  });

  // ========================================================
  // TRACK 3: Place Negative Tests 3 & 4 below
  // (e.g., Missing scope check -> 403 & facility mismatch -> 404)
  // ========================================================

  it('Test 3: authenticated user without courts:read scope returns 403', async () => {
    const token = await issueMockToken({
      subject: 'student-a',
      scopes: ['bookings:read'],
    });

    const res = await fetch(`${BASE_URL}/v1/courts`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    assert.equal(res.status, 403);
    assert.match(
      res.headers.get('content-type') || '',
      /application\/problem\+json/
    );
    assert.match(
      res.headers.get('www-authenticate') || '',
      /insufficient_scope/
    );

    const body = await res.json();
    assert.equal(body.status, 403);
  });

  it('Test 4: user from another facility cannot read the court and gets 404', async () => {
    const token = await issueMockToken({
      subject: 'student-other-facility',
      scopes: ['courts:read'],
      facilityId: 'fac-other',
    });

    const res = await fetch(`${BASE_URL}/v1/courts/crt_Padel01`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    assert.equal(res.status, 404);
    assert.match(
      res.headers.get('content-type') || '',
      /application\/problem\+json/
    );

    const body = await res.json();
    assert.equal(body.status, 404);
  });
});