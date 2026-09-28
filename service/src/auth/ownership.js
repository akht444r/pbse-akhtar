// service/src/auth/ownership.js — Layer 3: "may this principal access
// this object?" Kept separate from the handlers so ownership rules can
// be read and tested without reading route code or touching HTTP.
//
// A predicate here answers a question about ONE already-loaded row; it
// never queries the database itself, and it never decides the HTTP
// status — the handler does that (see routes/bookings.js, which always
// answers a missing object and a not-mine object with the same 404).

export function mayAccessBooking(principal, booking) {
  return booking.user_id === principal.subject;
}
