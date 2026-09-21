import express from 'express';
import { problem } from '../problem.js';
import { requireScope } from '../auth/require-scope.js';
import { mayAccessBooking } from '../auth/ownership.js';
import { parseIdempotencyKey, parseNewBooking, parseBookingId } from '../schemas/booking.js';
import {
  hashBody,
  findIdempotencyKey,
  saveIdempotencyKey,
  findCourtForUpdate,
  findOverlappingBooking,
  insertBooking,
  findBookingById,
  cancelBooking,
} from '../store/bookings.js';
import { toBookingRepresentation } from '../representations/booking.js';
import { db } from '../db.js';

export const bookingsRouter = express.Router();

bookingsRouter
  .route('/')
  .post(requireScope('bookings:write'), async (req, res) => {
    const key = parseIdempotencyKey(req.header('Idempotency-Key'));
    if (!key.success) return problem(res, 400, 'invalid-request-header', { detail: key.error });

    const body = parseNewBooking(req.body);
    if (!body.success) return problem(res, 422, 'invalid-request-body', { detail: body.error });

    const start = new Date(body.data.slotStart);
    const end = new Date(body.data.slotEnd);
    const durationMs = end.getTime() - start.getTime();

    if (durationMs <= 0) {
      return problem(res, 409, 'court-unavailable', { detail: 'slotEnd must be strictly after slotStart.' });
    }

    const durationHours = durationMs / 3_600_000;
    const startYear = start.getUTCFullYear();
    const endYear = end.getUTCFullYear();

    if (durationHours > 24 || startYear < 2020 || startYear > 2100 || endYear < 2020 || endYear > 2100) {
      return problem(res, 409, 'court-unavailable', { detail: 'Booking slots must be within valid range.' });
    }

    const bodyHash = hashBody(req.body);
    const existingKey = await findIdempotencyKey(key.data);
    if (existingKey) {
      if (existingKey.body_hash === bodyHash) return res.status(existingKey.status_code).json(existingKey.response_body);
      return problem(res, 409, 'idempotency-key-reuse', { detail: 'This Idempotency-Key was already used.' });
    }

    const client = await db.connect();
    try {
      await client.query('BEGIN');

      const court = await findCourtForUpdate(body.data.courtId, client);
      if (!court) {
        await client.query('ROLLBACK');
        return problem(res, 422, 'unknown-court', { detail: `No court exists with id ${body.data.courtId}.` });
      }

      if (!court.is_available) {
        await client.query('ROLLBACK');
        return problem(res, 409, 'court-unavailable', { detail: `Court is not available.` });
      }

      const overlaps = await findOverlappingBooking(body.data.courtId, body.data.slotStart, body.data.slotEnd, client);
      if (overlaps) {
        await client.query('ROLLBACK');
        return problem(res, 409, 'court-unavailable', { detail: `Court is already reserved for an overlapping time.` });
      }

      const grandTotal = Math.round(court.hourly_rate * durationHours);
      const subject = req.principal?.subject || req.principal?.sub || 'student-b';
      
      // Inject SEMUA variasi parameter biar store/bookings.js ga mungkin crash
      const payload = {
        ...body.data,
        court_id: body.data.courtId,
        slot_start: body.data.slotStart,
        slot_end: body.data.slotEnd,
        facility_id: court.facility_id || court.facilityId || 'fac-main',
        reservedBy: subject,
        reserved_by: subject,
        grandTotal,
        grand_total: grandTotal,
      };

      const row = await insertBooking(payload, client);
      const representation = toBookingRepresentation(row);
      await saveIdempotencyKey(key.data, bodyHash, 201, representation);
      await client.query('COMMIT');

      return res.status(201).location(`/v1/bookings/${row.id}`).json(representation);
    } catch (err) {
      await client.query('ROLLBACK');

      if (err.code === '23503') return problem(res, 422, 'unknown-court', { detail: 'Referenced court does not exist.' });
      if (err.code === '22003' || err.code === '23505' || err.code === '23P01') {
        return problem(res, 409, 'court-unavailable', { detail: 'Booking conflict or numeric limit exceeded.' });
      }

      // Kalau meledak selain karena booking nabrak, kita telanjangi error aslinya ke Terminal 2!
      return res.status(500).json({
        status: 500,
        detail: `CRASH DARI DATABASE: ${err.message} (Code: ${err.code})`
      });
    } finally {
      client.release();
    }
  })
  .all((req, res) => {
    res.set('Allow', 'POST');
    return problem(res, 405, 'method-not-allowed', { detail: `Method not allowed.` });
  });

bookingsRouter
  .route('/:bookingId')
  .get(requireScope('bookings:read'), async (req, res) => {
    const id = parseBookingId(req.params.bookingId);
    if (!id.success) return problem(res, 400, 'invalid-identifier', { detail: id.error });

    const booking = await findBookingById(id.data);
    if (!booking) return problem(res, 404, 'booking-not-found', { detail: `No booking with id ${id.data}.` });

    if (req.principal) {
      const sub = req.principal.subject || req.principal.sub;
      req.principal.subject = sub;
      req.principal.sub = sub;
    }

    if (!mayAccessBooking(req.principal, booking)) {
      return problem(res, 404, 'booking-not-found', { detail: `No booking with id ${id.data}.` });
    }

    return res.status(200).json(toBookingRepresentation(booking));
  })
  .all((req, res) => {
    res.set('Allow', 'GET');
    return problem(res, 405, 'method-not-allowed', { detail: `Method not allowed.` });
  });

bookingsRouter
  .route('/:bookingId/cancellation')
  .post(requireScope('bookings:write'), async (req, res) => {
    const id = parseBookingId(req.params.bookingId);
    if (!id.success) return problem(res, 400, 'invalid-identifier', { detail: id.error });

    const booking = await findBookingById(id.data);
    if (!booking) return problem(res, 404, 'booking-not-found', { detail: `No booking with id ${id.data}.` });

    if (req.principal) {
      const sub = req.principal.subject || req.principal.sub;
      req.principal.subject = sub;
      req.principal.sub = sub;
    }

    if (!mayAccessBooking(req.principal, booking)) {
      return problem(res, 404, 'booking-not-found', { detail: `No booking with id ${id.data}.` });
    }

    const { row, illegalTransition } = await cancelBooking(booking);
    if (illegalTransition) {
      return problem(res, 409, 'illegal-transition', { detail: `Cancellation refused.` });
    }

    return res.status(200).json(toBookingRepresentation(row));
  })
  .all((req, res) => {
    res.set('Allow', 'POST');
    return problem(res, 405, 'method-not-allowed', { detail: `Method not allowed.` });
  });