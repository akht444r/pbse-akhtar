const TITLES = {
  'invalid-request-body': 'Invalid Request Body',
  'invalid-identifier': 'Invalid Resource Identifier',
  'court-not-found': 'Court Not Found',
  'unknown-court': 'Referenced Court Does Not Exist',
  'booking-not-found': 'Booking Not Found',
  'court-unavailable': 'Court Unavailable',
  'idempotency-key-reuse': 'Idempotency Key Reused With Different Body',
  'internal-error': 'Internal Server Error'
};

export function problem(res, status, slug, options = {}) {
  const { detail, extensions = {} } = options;
  return res.status(status)
    .type('application/problem+json')
    .json({
      type: `https://api.campus-court.example/problems/${slug}`,
      title: TITLES[slug] || 'Service Error',
      status,
      ...(detail ? { detail } : {}),
      instance: `urn:request:${Date.now()}`,
      ...extensions
    });
}

export function unauthorized(res, error = 'invalid_token') {
  res.set('WWW-Authenticate', `Bearer error="${error}"`);
  return problem(res, 401, 'unauthenticated', {
    detail: 'Authentication token is missing, invalid, or expired.',
  });
}

export function forbidden(res, needed = []) {
  res.set(
    'WWW-Authenticate',
    `Bearer error="insufficient_scope", scope="${needed.join(' ')}"`
  );
  return problem(res, 403, 'insufficient-scope', {
    detail: `Operation requires scopes: ${needed.join(' ')}.`,
  });
}