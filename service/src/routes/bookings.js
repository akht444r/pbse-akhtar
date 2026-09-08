// routes/bookings.js
import express from 'express';
import { problem } from '../problem.js';
import { parseIdempotencyKey, parseNewBooking } from '../schemas/booking.js';
import {
  hashBody,
  findIdempotencyKey,
  saveIdempotencyKey,
  findCourtForUpdate,
  findOverlappingBooking,
  insertBooking,
} from '../store/bookings.js';
import { toBookingRepresentation } from '../representations/booking.js';
import { db } from '../db.js';

export const bookingsRouter = express.Router();

// POST /bookings — matches spec/openapi.yaml paths./bookings.post.
// Follows the four-condition idempotency table from A.8 exactly:
//   1. Header missing/malformed        -> 400
//   2. Key never seen                  -> do the work, store the response, 201
//   3. Key seen, identical body        -> replay the stored response, 201
//   4. Key seen, different body        -> 409 idempotency-key-reuse
bookingsRouter.post('/', async (req, res) => {
  // 2 · validate — the header first
  const key = parseIdempotencyKey(req.header('Idempotency-Key'));
  if (!key.success) {
    return problem(res, 400, 'invalid-request-body', { detail: key.error });
  }

  // 2 · validate — the body
  const body = parseNewBooking(req.body);
  if (!body.success) {
    return problem(res, 400, 'invalid-request-body', { detail: body.error });
  }

  const bodyHash = hashBody(req.body);

  // Condition 2/3/4: look the key up before doing any work.
  const existingKey = await findIdempotencyKey(key.data);
  if (existingKey) {
    if (existingKey.body_hash === bodyHash) {
      // Condition 3: same key, same body — replay, do no new work.
      return res.status(existingKey.status_code).json(existingKey.response_body);
    }
    // Condition 4: same key, different body.
    return problem(res, 409, 'idempotency-key-reuse', {
      detail: 'This Idempotency-Key was already used for a different request.',
    });
  }

  // Condition 2: key never seen before. Do the work inside one transaction
  // so the availability check and the insert cannot race with another
  // request for the same slot.
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // 3 · work
    const court = await findCourtForUpdate(body.data.courtId, client);
    if (!court) {
      await client.query('ROLLBACK');
      return problem(res, 422, 'unknown-court', {
        detail: `No court exists with id ${body.data.courtId}.`,
      });
    }
    if (!court.is_available) {
      await client.query('ROLLBACK');
      return problem(res, 409, 'court-unavailable', {
        detail: `Court ${court.id} is not available for booking.`,
      });
    }

    const overlaps = await findOverlappingBooking(
      body.data.courtId,
      body.data.slotStart,
      body.data.slotEnd,
      client
    );
    if (overlaps) {
      await client.query('ROLLBACK');
      return problem(res, 409, 'court-unavailable', {
        detail: `Court ${court.id} is already reserved for an overlapping time.`,
      });
    }

    const durationHours = (body.data.slotEnd - body.data.slotStart) / 3_600_000;
    const grandTotal = Math.round(court.hourly_rate * durationHours);

    const row = await insertBooking({ ...body.data, grandTotal }, client);

    // 4 · represent, 5 · respond
    const representation = toBookingRepresentation(row);
    await saveIdempotencyKey(key.data, bodyHash, 201, representation);

    await client.query('COMMIT');

    return res
      .status(201)
      .location(`/v1/bookings/${row.id}`)
      .json(representation);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err; // caught by app.js's global error handler -> 500
  } finally {
    client.release();
  }
});
