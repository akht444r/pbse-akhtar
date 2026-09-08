// schemas/court.js — validation rules, copied from the contract's
// /courts GET parameters (spec/openapi.yaml)

// The contract declares one optional query parameter: isAvailable (boolean).
// No pagination is documented for this operation, so none is validated here.
export function parseListCourtsQuery(query) {
  const { isAvailable } = query;

  if (isAvailable === undefined) {
    return { success: true, data: {} };
  }

  if (isAvailable !== 'true' && isAvailable !== 'false') {
    return {
      success: false,
      error: 'isAvailable must be "true" or "false"',
    };
  }

  return { success: true, data: { isAvailable: isAvailable === 'true' } };
}

// Matches the courtId pattern from the contract's path parameter for
// /courts/{courtId}: crt_ followed by 4+ alphanumeric characters.
const COURT_ID_PATTERN = /^crt_[A-Za-z0-9]{4,}$/;

export function parseCourtId(courtId) {
  if (!COURT_ID_PATTERN.test(courtId)) {
    return { success: false, error: 'courtId must match ^crt_[A-Za-z0-9]{4,}$' };
  }
  return { success: true, data: courtId };
}
