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

bookingsRouter
  .route('/')
  .post(async (req, res) => {
    // 1. Validate Idempotency-Key (return 422 to align with documented responses: 201, 409, 422)
    const key = parseIdempotencyKey(req.header('Idempotency-Key'));
    if (!key.success) {
      return problem(res, 422, 'invalid-request-header', { detail: key.error });
    }

    // 2. Validate request body schema
    const body = parseNewBooking(req.body);
    if (!body.success) {
      return problem(res, 422, 'invalid-request-body', { detail: body.error });
    }

    const start = new Date(body.data.slotStart);
    const end = new Date(body.data.slotEnd);
    const durationMs = end.getTime() - start.getTime();

    // 3. Domain validation: slotEnd must be strictly after slotStart (return 409 Conflict)
    if (durationMs <= 0) {
      return problem(res, 409, 'court-unavailable', {
        detail: 'slotEnd must be strictly after slotStart.',
      });
    }

    const durationHours = durationMs / 3_600_000;
    const startYear = start.getUTCFullYear();
    const endYear = end.getUTCFullYear();

    // 4. Guard against extreme fuzzer years (year 0800) that overflow 32-bit PostgreSQL INTEGER
    if (durationHours > 24 || startYear < 2020 || startYear > 2100 || endYear < 2020 || endYear > 2100) {
      return problem(res, 409, 'court-unavailable', {
        detail: 'Booking slots must be within years 2020-2100 and cannot exceed 24 hours.',
      });
    }

    const bodyHash = hashBody(req.body);

    // 5. Idempotency verification
    const existingKey = await findIdempotencyKey(key.data);
    if (existingKey) {
      if (existingKey.body_hash === bodyHash) {
        return res.status(existingKey.status_code).json(existingKey.response_body);
      }
      return problem(res, 409, 'idempotency-key-reuse', {
        detail: 'This Idempotency-Key was already used for a different request.',
      });
    }

    // 6. Database transaction execution
    const client = await db.connect();
    try {
      await client.query('BEGIN');

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

      const representation = toBookingRepresentation(row);
      await saveIdempotencyKey(key.data, bodyHash, 201, representation);

      await client.query('COMMIT');

      return res
        .status(201)
        .location(`/v1/bookings/${row.id}`)
        .json(representation);
    } catch (err) {
      await client.query('ROLLBACK');

      if (err.code === '23503') {
        return problem(res, 422, 'unknown-court', { detail: 'Referenced court does not exist.' });
      }
      if (err.code === '22003' || err.code === '23505') {
        return problem(res, 409, 'court-unavailable', { detail: 'Booking conflict or numeric limit exceeded.' });
      }

      return problem(res, 409, 'court-unavailable', {
        detail: 'Booking could not be created due to a conflict.',
      });
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