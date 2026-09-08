import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const BASE_URL = process.env.SERVICE_URL || 'http://localhost:3000';

describe('API Contract Conformance Tests', () => {
  it('GET /health returns 200 with status ok', async () => {
    const res = await fetch(`${BASE_URL}/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.deepEqual(body, { status: 'ok' });
  });

  it('GET /v1/courts returns 200 and an array representation', async () => {
    const res = await fetch(`${BASE_URL}/v1/courts`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') || '', /application\/json/);
    const body = await res.json();
    assert.ok(Array.isArray(body) || Array.isArray(body.items));
  });

  it('GET /v1/courts/{id} returns 400 when identifier format is invalid', async () => {
    const res = await fetch(`${BASE_URL}/v1/courts/invalid-not-uuid`);
    assert.equal(res.status, 400);
    assert.match(res.headers.get('content-type') || '', /application\/problem\+json/);
    const body = await res.json();
    assert.ok(body.type);
    assert.equal(body.status, 400);
  });

  it('POST /v1/bookings returns 400 Problem Details if Idempotency-Key is missing', async () => {
    const res = await fetch(`${BASE_URL}/v1/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courtId: 'c0000000-0000-0000-0000-000000000001' }),
    });
    assert.equal(res.status, 400);
    assert.match(res.headers.get('content-type') || '', /application\/problem\+json/);
  });
});