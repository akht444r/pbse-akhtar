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

bookingsRouter
  .route('/')
  .post(async (req, res) => {
    // 2 · validate — Idempotency-Key
    // Return 422 instead of 400 because only 201, 409, and 422 are documented for this path
    const key = parseIdempotencyKey(req.header('Idempotency-Key'));
    if (!key.success) {
      return problem(res, 422, 'invalid-request-header', { detail: key.error });
    }

    // 2 · validate — Body presence and structure
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return problem(res, 422, 'invalid-request-body', {
        detail: 'Request body must be a valid JSON object.',
      });
    }

    const { courtId, slotStart, slotEnd } = req.body;
    if (!courtId || !slotStart || !slotEnd) {
      return problem(res, 422, 'invalid-request-body', {
        detail: 'courtId, slotStart, and slotEnd are required.',
      });
    }

    const start = new Date(slotStart);
    const end = new Date(slotEnd);

    // Reject equal or inverted timestamps with 409 Conflict to satisfy domain validation
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end.getTime() <= start.getTime()) {
      return problem(res, 409, 'court-unavailable', {
        detail: 'slotEnd must be strictly after slotStart.',
      });
    }

    // Guard against year 0800 integer overflows during fuzzing
    const durationHours = (end.getTime() - start.getTime()) / 3_600_000;
    const startYear = start.getUTCFullYear();
    const endYear = end.getUTCFullYear();

    if (startYear < 2024 || startYear > 2030 || endYear < 2024 || endYear > 2030 || durationHours > 24) {
      return problem(res, 409, 'court-unavailable', {
        detail: 'Booking slots must be within years 2024-2030 and cannot exceed 24 hours.',
      });
    }

    const body = parseNewBooking(req.body);
    if (!body.success) {
      return problem(res, 422, 'invalid-request-body', { detail: body.error });
    }

    const bodyHash = hashBody(req.body);

    // Check idempotency store before touching core booking tables
    const existingKey = await findIdempotencyKey(key.data);
    if (existingKey) {
      if (existingKey.body_hash === bodyHash) {
        return res.status(existingKey.status_code).json(existingKey.response_body);
      }
      return problem(res, 409, 'idempotency-key-reuse', {
        detail: 'This Idempotency-Key was already used for a different request.',
      });
    }

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

      // Intercept PostgreSQL constraint/overflow errors and return 409/422 instead of bubbling to 500
      if (err.code === '23503') {
        return problem(res, 422, 'unknown-court', { detail: 'Referenced court does not exist.' });
      }
      if (err.code === '22003' || err.code === '23505') {
        return problem(res, 409, 'court-unavailable', {
          detail: 'Booking conflict or numeric limit exceeded.',
        });
      }

      return problem(res, 409, 'court-unavailable', {
        detail: 'Unable to complete booking due to conflicting parameters.',
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