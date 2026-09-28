// representations/booking.js — field names here are the contract's
// (spec/openapi.yaml Booking schema); column names are the database's.
export function toBookingRepresentation(row) {
  return {
    id: row.id,
    courtId: row.court_id,
    reservedBy: row.user_id,
    slotStart: new Date(row.slot_start).toISOString(),
    slotEnd: new Date(row.slot_end).toISOString(),
    status: row.status,
    grandTotal: row.total_fee,
    currency: 'IDR',
  };
}
