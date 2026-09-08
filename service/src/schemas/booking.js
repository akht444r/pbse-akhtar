// schemas/booking.js — validation rules copied from the contract's
// POST /bookings parameters and requestBody (spec/openapi.yaml)

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COURT_ID_PATTERN = /^crt_[A-Za-z0-9]{4,}$/;

export function parseIdempotencyKey(headerValue) {
  if (!headerValue) {
    return { success: false, error: 'Idempotency-Key header is required.' };
  }
  if (!UUID_PATTERN.test(headerValue)) {
    return { success: false, error: 'Idempotency-Key must be a UUID.' };
  }
  return { success: true, data: headerValue };
}

// NOTE: reservedBy is NOT in the contract's NewBooking.required list, and
// there is no authentication this session (Session 3 rule 0.5), so there
// is currently no way to derive it from a token. Accepted here as an
// optional field as a stopgap — flag with the team, since this needs a
// real fix once auth is added (Meeting 4).
export function parseNewBooking(body) {
  if (typeof body !== 'object' || body === null) {
    return { success: false, error: 'Request body must be a JSON object.' };
  }

  const { courtId, slotStart, slotEnd, reservedBy } = body;

  if (typeof courtId !== 'string' || !COURT_ID_PATTERN.test(courtId)) {
    return { success: false, error: 'courtId must match ^crt_[A-Za-z0-9]{4,}$' };
  }

  const start = new Date(slotStart);
  const end = new Date(slotEnd);
  if (typeof slotStart !== 'string' || Number.isNaN(start.getTime())) {
    return { success: false, error: 'slotStart must be a valid RFC 3339 date-time.' };
  }
  if (typeof slotEnd !== 'string' || Number.isNaN(end.getTime())) {
    return { success: false, error: 'slotEnd must be a valid RFC 3339 date-time.' };
  }
  if (end <= start) {
    return { success: false, error: 'slotEnd must be after slotStart.' };
  }
  if (reservedBy !== undefined && typeof reservedBy !== 'string') {
    return { success: false, error: 'reservedBy must be a string when present.' };
  }

  return {
    success: true,
    data: {
      courtId,
      slotStart: start,
      slotEnd: end,
      reservedBy: reservedBy ?? 'usr_anonymous',
    },
  };
}
