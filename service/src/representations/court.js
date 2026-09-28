// representations/court.js — the only place that decides which fields
// the caller is allowed to see. Field names here are the contract's
// (spec/openapi.yaml Court schema); column names are the database's.
export function toCourtRepresentation(row) {
  return {
    id: row.id,
    name: row.name,
    courtType: row.type,
    isAvailable: row.is_available,
    hourlyRate: row.hourly_rate,
    currency: 'IDR',
  };
}
