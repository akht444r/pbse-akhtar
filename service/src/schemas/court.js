const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseListCourtsQuery(query) {
  const allowedKeys = ['isAvailable'];
  const keys = Object.keys(query);
  const hasExtra = keys.some((k) => !allowedKeys.includes(k));

  if (hasExtra) {
    return { success: false, error: 'Unknown query parameter.' };
  }

  if (query.isAvailable !== undefined) {
    if (query.isAvailable !== 'true' && query.isAvailable !== 'false') {
      return { success: false, error: 'isAvailable must be "true" or "false".' };
    }
    return { success: true, data: { isAvailable: query.isAvailable === 'true' } };
  }

  return { success: true, data: {} };
}

export function parseCourtId(id) {
  if (!id || typeof id !== 'string' || !UUID_REGEX.test(id.trim())) {
    return { success: false, error: 'courtId must be a valid UUID.' };
  }
  return { success: true, data: id.trim() };
}