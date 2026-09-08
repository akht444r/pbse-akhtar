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
  if (!id || typeof id !== 'string' || id.trim() === '') {
    return { success: false, error: 'courtId is required.' };
  }
  return { success: true, data: id.trim() };
}