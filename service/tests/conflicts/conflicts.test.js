// Session 5: conditional writes (A.8) and field-level validation errors (A.6).
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { setupMockIdp, teardownMockIdp, issueMockToken } from '../helpers/tokens.js';

const BASE_URL = process.env.SERVICE_URL || 'http://localhost:3000';

function slot(hour = 10) {
  const d = new Date(Date.now() + (Math.floor(Math.random() * 500) + 60) * 86400000);
  const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { slotStart: `${day}T${String(hour).padStart(2, '0')}:00:00+07:00`, slotEnd: `${day}T${String(hour + 1).padStart(2, '0')}:00:00+07:00` };
}

describe('Session 5: conditional writes and field-level errors', () => {
  let token;
  before(async () => {
    await setupMockIdp(9999);
    token = await issueMockToken({ subject: 'student-conflicts', scopes: ['courts:read', 'bookings:read', 'bookings:write'] });
  });
  after(async () => { await teardownMockIdp(); });

  const headers = (extra = {}) => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...extra });

  async function newBooking() {
    const res = await fetch(`${BASE_URL}/v1/bookings`, {
      method: 'POST',
      headers: headers({ 'Idempotency-Key': crypto.randomUUID() }),
      body: JSON.stringify({ courtId: 'crt_Padel01', ...slot() }),
    });
    assert.equal(res.status, 201, 'setup: booking must be created');
    return res.json();
  }
  const read = (id) => fetch(`${BASE_URL}/v1/bookings/${id}`, { headers: headers() });
  const cancel = (id, ifMatch) => fetch(`${BASE_URL}/v1/bookings/${id}/cancellation`, { method: 'POST', headers: headers(ifMatch ? { 'If-Match': ifMatch } : {}) });

  it('a cancel that carries the current ETag succeeds and returns the new ETag', async () => {
    const booking = await newBooking();
    const seen = await read(booking.id);
    const etag = seen.headers.get('etag');
    assert.ok(etag, 'GET must expose an ETag');
    const res = await cancel(booking.id, etag);
    assert.equal(res.status, 200);
    assert.equal((await res.json()).status, 'cancelled');
    assert.notEqual(res.headers.get('etag'), etag, 'the version changed, so the ETag must change');
  });

  it('two windows: the second cancel carries a stale ETag and gets 412, nothing changes', async () => {
    const booking = await newBooking();
    const etag = (await read(booking.id)).headers.get('etag'); // both windows saw this version
    assert.equal((await cancel(booking.id, etag)).status, 200); // window 1 gets there first
    const late = await cancel(booking.id, etag); // window 2 acts on what it saw
    assert.equal(late.status, 412);
    assert.match(late.headers.get('content-type') || '', /application\/problem\+json/);
    const problem = await late.json();
    assert.equal(problem.status, 412);
    assert.match(problem.type, /precondition-failed$/);
    assert.equal((await (await read(booking.id)).json()).status, 'cancelled');
  });

  it('a cancel without If-Match still works (the header is optional in the contract)', async () => {
    const booking = await newBooking();
    assert.equal((await cancel(booking.id)).status, 200);
  });

  it('an empty form is a 400 that names every missing field', async () => {
    const res = await fetch(`${BASE_URL}/v1/bookings`, { method: 'POST', headers: headers({ 'Idempotency-Key': crypto.randomUUID() }), body: '{}' });
    assert.equal(res.status, 400);
    assert.match(res.headers.get('content-type') || '', /application\/problem\+json/);
    const problem = await res.json();
    assert.deepEqual(problem.invalidFields.map((f) => f.name).sort(), ['courtId', 'slotEnd', 'slotStart']);
    assert.ok(problem.invalidFields.every((f) => f.reason && f.reason.length > 0));
  });

  it('malformed JSON is a 400 Problem Details, never a 500 or an HTML page', async () => {
    const res = await fetch(`${BASE_URL}/v1/bookings`, { method: 'POST', headers: headers({ 'Idempotency-Key': crypto.randomUUID() }), body: '{"courtId":' });
    assert.equal(res.status, 400);
    assert.match(res.headers.get('content-type') || '', /application\/problem\+json/);
  });
});
