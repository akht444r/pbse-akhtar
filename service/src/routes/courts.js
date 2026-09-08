// routes/courts.js
import express from 'express';
import { problem } from '../problem.js';
import { parseListCourtsQuery, parseCourtId } from '../schemas/court.js';
import { findCourts, findCourtById } from '../store/courts.js';
import { toCourtRepresentation } from '../representations/court.js';

export const courtsRouter = express.Router();

courtsRouter
  .route('/')
  .get(async (req, res) => {
    // 2 · validate query parameters strictly
    const queryKeys = Object.keys(req.query);
    const hasInvalidKeys = queryKeys.some((key) => key !== 'isAvailable');
    const invalidVal =
      req.query.isAvailable !== undefined &&
      req.query.isAvailable !== 'true' &&
      req.query.isAvailable !== 'false';

    if (hasInvalidKeys || invalidVal) {
      return problem(res, 400, 'invalid-query-parameter', {
        detail: 'Only boolean query parameter "isAvailable" (true/false) is allowed.',
      });
    }

    const query = parseListCourtsQuery(req.query);
    if (!query.success) {
      return problem(res, 400, 'invalid-request-body', { detail: query.error });
    }

    // 3 · work
    const rows = await findCourts(query.data);

    // 4 · represent, 5 · respond
    return res.status(200).json(rows.map(toCourtRepresentation));
  })
  .all((req, res) => {
    res.set('Allow', 'GET');
    return problem(res, 405, 'method-not-allowed', {
      detail: `Method ${req.method} is not allowed on /courts.`,
    });
  });

courtsRouter
  .route('/:courtId')
  .get(async (req, res) => {
    // 2 · validate
    const id = parseCourtId(req.params.courtId);
    if (!id.success) {
      return problem(res, 400, 'invalid-identifier', { detail: id.error });
    }

    // 3 · work
    const court = await findCourtById(id.data);
    if (!court) {
      return problem(res, 404, 'court-not-found', {
        detail: `No court with id ${id.data}.`,
      });
    }

    // 4 · represent, 5 · respond
    return res.status(200).json(toCourtRepresentation(court));
  })
  .all((req, res) => {
    res.set('Allow', 'GET');
    return problem(res, 405, 'method-not-allowed', {
      detail: `Method ${req.method} is not allowed on /courts/:courtId.`,
    });
  });