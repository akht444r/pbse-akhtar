// store/bookings.js — the only place SQL for these resources is written
import crypto from 'node:crypto';
import { db } from '../db.js';

// Deterministic hash of a request body, used to detect whether a retried
// Idempotency-Key is being reused with the same or a different body.
export function hashBody(body) {
  const canonical = JSON.stringify(body, Object.keys(body).sort());
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

export async function findIdempotencyKey(key) {
  const { rows } = await db.query(
    'SELECT * FROM idempotency_keys WHERE key = $1',
    [key]
  );
  return rows[0]; // undefined when never seen before
}

export async function saveIdempotencyKey(key, bodyHash, statusCode, responseBody) {
  await db.query(
    `INSERT INTO idempotency_keys (key, body_hash, status_code, response_body)
     VALUES ($1, $2, $3, $4)`,
    [key, bodyHash, statusCode, responseBody]
  );
}

export async function findCourtForUpdate(courtId, client) {
  const { rows } = await client.query(
    'SELECT * FROM courts WHERE id = $1',
    [courtId]
  );
  return rows[0];
}

// Interval-overlap test: an existing booking conflicts if it starts
// before the new slot ends AND ends after the new slot starts, and it
// hasn't been cancelled or rejected.
export async function findOverlappingBooking(courtId, slotStart, slotEnd, client) {
  const { rows } = await client.query(
    `SELECT 1 FROM bookings
     WHERE court_id = $1
       AND status NOT IN ('cancelled', 'rejected')
       AND slot_start < $3
       AND slot_end > $2
     LIMIT 1`,
    [courtId, slotStart, slotEnd]
  );
  return rows.length > 0;
}

export async function insertBooking(booking, client) {
  const id = 'bkg_' + crypto.randomBytes(6).toString('hex');
  const { rows } = await client.query(
    `INSERT INTO bookings (id, court_id, user_id, slot_start, slot_end, status, total_fee)
     VALUES ($1, $2, $3, $4, $5, 'confirmed', $6)
     RETURNING *`,
    [id, booking.courtId, booking.reservedBy, booking.slotStart, booking.slotEnd, booking.grandTotal]
  );
  return rows[0];
}
