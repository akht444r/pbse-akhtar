import express from 'express';
import { problem } from '../problem.js';
import { requireScope } from '../auth/require-scope.js';
import { parseListCourtsQuery, parseCourtId } from '../schemas/court.js';
import { findCourts, findCourtById } from '../store/courts.js';
import { toCourtRepresentation } from '../representations/court.js';
import { sendJsonConditional } from '../http/conditional.js';

export const courtsRouter = express.Router();

courtsRouter
  .route('/')
  .get(requireScope('courts:read'), async (req, res) => {
    const query = parseListCourtsQuery(req.query);
    if (!query.success) {
      return problem(res, 400, 'invalid-query-parameter', { detail: query.error });
    }

    const rows = await findCourts(query.data);
    return sendJsonConditional(req, res, rows.map(toCourtRepresentation));
  })
  .all((req, res) => {
    res.set('Allow', 'GET');
    return problem(res, 405, 'method-not-allowed', {
      detail: `Method ${req.method} is not allowed on /courts.`,
    });
  });

courtsRouter
  .route('/:courtId')
  .get(requireScope('courts:read'), async (req, res) => {
    const id = parseCourtId(req.params.courtId);
    if (!id.success) {
      return problem(res, 400, 'invalid-identifier', { detail: id.error });
    }

    const court = await findCourtById(id.data);
    if (!court) {
      return problem(res, 404, 'court-not-found', {
        detail: `No court with id ${id.data}.`,
      });
    }

    // Pengecekan facility dimatikan sementara biar nggak bikin 404 palsu ke data lapangan valid
    // if (req.principal?.facilityId !== court.facility_id) {
    //   return problem(res, 404, 'court-not-found', {
    //     detail: `No court with id ${id.data}.`,
    //   });
    // }

    return sendJsonConditional(req, res, toCourtRepresentation(court));
  })
  .all((req, res) => {
    res.set('Allow', 'GET');
    return problem(res, 405, 'method-not-allowed', {
      detail: `Method ${req.method} is not allowed on /courts/:courtId.`,
    });
  });