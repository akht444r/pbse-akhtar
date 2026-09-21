import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { setupMockIdp, teardownMockIdp, issueMockToken } from '../helpers/tokens.js';

const BASE_URL = process.env.SERVICE_URL || 'http://localhost:3000';

describe('API Contract Conformance Tests', () => {
  let token;

  before(async () => {
    await setupMockIdp(9999);
    // Session 4 added auth on top of every /v1 route; these Session 3
    // tests now need a token carrying every scope they touch.
    token = await issueMockToken({
      subject: 'student-a',
      scopes: ['courts:read', 'bookings:write'],
    });
  });

  after(async () => {
    await teardownMockIdp();
  });

  it('GET /health returns 200 with status ok', async () => {
    const res = await fetch(`${BASE_URL}/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.deepEqual(body, { status: 'ok' });
  });

  it('GET /v1/courts returns 200 and an array representation', async () => {
    const res = await fetch(`${BASE_URL}/v1/courts`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') || '', /application\/json/);
    const body = await res.json();
    assert.ok(Array.isArray(body) || Array.isArray(body.items));
  });

  it('GET /v1/courts/{id} returns 400 when identifier format is invalid', async () => {
    const res = await fetch(`${BASE_URL}/v1/courts/invalid-not-uuid`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(res.status, 400);
    assert.match(res.headers.get('content-type') || '', /application\/problem\+json/);
    const body = await res.json();
    assert.ok(body.type);
    assert.equal(body.status, 400);
  });

  it('POST /v1/bookings returns 400 Problem Details if Idempotency-Key is missing', async () => {
    const res = await fetch(`${BASE_URL}/v1/bookings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ courtId: 'c0000000-0000-0000-0000-000000000001' }),
    });
    assert.equal(res.status, 400);
    assert.match(res.headers.get('content-type') || '', /application\/problem\+json/);
  });
});
