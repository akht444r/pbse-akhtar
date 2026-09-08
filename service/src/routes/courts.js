// routes/courts.js
import express from 'express';
import { problem } from '../problem.js';
import { parseListCourtsQuery, parseCourtId } from '../schemas/court.js';
import { findCourts, findCourtById } from '../store/courts.js';
import { toCourtRepresentation } from '../representations/court.js';

export const courtsRouter = express.Router();

// Collection endpoint: /courts
courtsRouter
  .route('/')
  .get(async (req, res) => {
    // 2 · validate
    // Reject unknown query parameters to enforce contract additionalProperties: false
    const allowedQueryParams = ['isAvailable'];
    const extraParams = Object.keys(req.query).filter((key) => !allowedQueryParams.includes(key));
    if (extraParams.length > 0) {
      return problem(res, 400, 'invalid-query-parameter', {
        detail: `Unknown query parameter(s): ${extraParams.join(', ')}.`,
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

// Single entity endpoint: /courts/:courtId
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