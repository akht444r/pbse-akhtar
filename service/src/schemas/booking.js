export function parseIdempotencyKey(header) {
  if (!header || typeof header !== 'string' || header.trim() === '') {
    return { success: false, error: 'Idempotency-Key header is required.' };
  }
  return { success: true, data: header.trim() };
}

export function parseNewBooking(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    const reason = 'Request body must be a valid JSON object.';
    return { success: false, error: reason, errors: [{ name: 'body', reason }] };
  }

  const { courtId, slotStart, slotEnd } = body;
  const errors = [];

  if (!courtId || typeof courtId !== 'string') {
    errors.push({ name: 'courtId', reason: 'Choose a court.' });
  }

  let start;
  let end;
  if (!slotStart || typeof slotStart !== 'string') {
    errors.push({ name: 'slotStart', reason: 'Pick a start time.' });
  } else {
    start = new Date(slotStart);
    if (isNaN(start.getTime())) errors.push({ name: 'slotStart', reason: 'The start time is not a valid date and time.' });
  }
  if (!slotEnd || typeof slotEnd !== 'string') {
    errors.push({ name: 'slotEnd', reason: 'Pick an end time.' });
  } else {
    end = new Date(slotEnd);
    if (isNaN(end.getTime())) errors.push({ name: 'slotEnd', reason: 'The end time is not a valid date and time.' });
  }

  if (errors.length > 0) {
    return { success: false, error: errors[0].reason, errors };
  }

  return {
    success: true,
    data: {
      courtId,
      slotStart: start.toISOString(),
      slotEnd: end.toISOString(),
    },
  };
}

// Matches the bookingId pattern declared in spec/openapi.yaml's path
// parameter for /bookings/{bookingId}.
const BOOKING_ID_PATTERN = /^bkg_[A-Za-z0-9]{4,}$/;

export function parseBookingId(bookingId) {
  if (typeof bookingId !== 'string' || !BOOKING_ID_PATTERN.test(bookingId)) {
    return { success: false, error: 'bookingId must match ^bkg_[A-Za-z0-9]{4,}$' };
  }
  return { success: true, data: bookingId };
}
