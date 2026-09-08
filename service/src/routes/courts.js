// routes/courts.js
import express from 'express';
import { problem } from '../problem.js';
import { parseListCourtsQuery, parseCourtId } from '../schemas/court.js';
import { findCourts, findCourtById } from '../store/courts.js';
import { toCourtRepresentation } from '../representations/court.js';

export const courtsRouter = express.Router();

// GET /courts — matches spec/openapi.yaml paths./courts.get exactly.
courtsRouter.get('/', async (req, res) => {
  // 2 · validate
  const query = parseListCourtsQuery(req.query);
  if (!query.success) {
    return problem(res, 400, 'invalid-request-body', { detail: query.error });
  }

  // 3 · work
  const rows = await findCourts(query.data);

  // 4 · represent, 5 · respond
  return res.status(200).json(rows.map(toCourtRepresentation));
});

// GET /courts/:courtId — matches spec/openapi.yaml paths./courts/{courtId}.get
courtsRouter.get('/:courtId', async (req, res) => {
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
});
