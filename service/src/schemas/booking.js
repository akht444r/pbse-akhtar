export function parseIdempotencyKey(header) {
  if (!header || typeof header !== 'string' || header.trim() === '') {
    return { success: false, error: 'Idempotency-Key header is required.' };
  }
  return { success: true, data: header.trim() };
}

export function parseNewBooking(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { success: false, error: 'Request body must be a valid JSON object.' };
  }

  const { courtId, slotStart, slotEnd } = body;

  if (!courtId || typeof courtId !== 'string') {
    return { success: false, error: 'courtId is required and must be a string.' };
  }
  if (!slotStart || typeof slotStart !== 'string') {
    return { success: false, error: 'slotStart is required and must be a string.' };
  }
  if (!slotEnd || typeof slotEnd !== 'string') {
    return { success: false, error: 'slotEnd is required and must be a string.' };
  }

  const start = new Date(slotStart);
  const end = new Date(slotEnd);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { success: false, error: 'slotStart and slotEnd must be valid ISO 8601 date-time strings.' };
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
