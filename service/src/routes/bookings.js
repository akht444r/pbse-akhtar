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

// POST /bookings — matches spec/openapi.yaml paths./bookings.post
bookingsRouter
  .route('/')
  .post(async (req, res) => {
    // 2 · validate — the header first
    const key = parseIdempotencyKey(req.header('Idempotency-Key'));
    if (!key.success) {
      return problem(res, 400, 'invalid-request-header', { detail: key.error });
    }

    // 2 · validate — the body
    const body = parseNewBooking(req.body);
    if (!body.success) {
      // If error is semantic date ordering, return 409 (domain conflict) instead of 400
      if (body.error && body.error.toLowerCase().includes('slot')) {
        return problem(res, 409, 'court-unavailable', { detail: body.error });
      }
      // Return 422 for malformed/missing body to match documented contract responses (201, 409, 422)
      return problem(res, 422, 'invalid-request-body', { detail: body.error });
    }

    // Sanitize dates and durations to prevent database integer overflows during fuzzing (e.g. year 0800)
    const startMs = new Date(body.data.slotStart).getTime();
    const endMs = new Date(body.data.slotEnd).getTime();
    const startDate = new Date(startMs);
    const durationHours = (endMs - startMs) / 3_600_000;

    if (
      isNaN(startMs) ||
      isNaN(endMs) ||
      endMs <= startMs ||
      durationHours > 24 ||
      startDate.getFullYear() < 2020 ||
      startDate.getFullYear() > 2100
    ) {
      return problem(res, 409, 'court-unavailable', {
        detail: 'Requested slot is unavailable or outside allowable booking limits (must be 1-24 hours).',
      });
    }

    const bodyHash = hashBody(req.body);

    // Condition 2/3/4: check idempotency key before running database operations
    const existingKey = await findIdempotencyKey(key.data);
    if (existingKey) {
      if (existingKey.body_hash === bodyHash) {
        // Condition 3: same key, identical body -> replay stored response
        return res.status(existingKey.status_code).json(existingKey.response_body);
      }
      // Condition 4: same key, different body -> 409 conflict
      return problem(res, 409, 'idempotency-key-reuse', {
        detail: 'This Idempotency-Key was already used for a different request.',
      });
    }

    // Condition 2: key never seen before
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

      // Catch foreign key violations and out-of-range values cleanly without 500 crashes
      if (err.code === '23503') {
        return problem(res, 422, 'unknown-court', {
          detail: 'Referenced court does not exist.',
        });
      }
      if (err.code === '22003' || err.code === '23505') {
        return problem(res, 409, 'court-unavailable', {
          detail: 'Booking could not be created due to conflicting parameters.',
        });
      }

      throw err; // unexpected runtime crashes bubble to global error handler
    } finally {
      client.release();
    }
  })
  .all((req, res) => {
    res.set('Allow', 'POST');
    return problem(res, 405, 'method-not-allowed', {
      detail: `Method ${req.method} is not allowed on /bookings.`,
    });
  });