// client/src/api/client.js

// A.2 item 4: Base URL taken strictly from environment
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// A.7 item 2: ETag cache that outlives component re-renders
const eTagCache = new Map();

// Identity provider used at sign-in (service/dev-idp.js in development).
export const IDP_URL = import.meta.env.VITE_IDP_URL || 'http://127.0.0.1:9999';

// ETags belong to one identity: forget them whenever the signed-in person changes.
export function clearApiCaches() {
  eTagCache.clear();
}

/**
 * Session persistence helper
 */
export function getActiveSession() {
  try {
    const raw = localStorage.getItem('campus_court_session');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setActiveSession(sessionData) {
  localStorage.setItem('campus_court_session', JSON.stringify(sessionData));
}

export function clearActiveSession() {
  localStorage.removeItem('campus_court_session');
}

/**
 * A.2 & A.3: Core network client wrapping fetch with RFC 9457 error translation
 */
export async function apiRequest(endpoint, { method = 'GET', body, headers = {}, ifMatch } = {}) {
  const session = getActiveSession();
  const requestHeaders = {
    'Content-Type': 'application/json',
    ...headers,
  };

  // A.3 item 1: Attach credentials in one place
  if (session?.token) {
    requestHeaders['Authorization'] = `Bearer ${session.token}`;
  }

  // A.8 item 1: Attach If-Match for conditional writes
  if (ifMatch) {
    requestHeaders['If-Match'] = ifMatch;
  }

  // A.7 item 1: Attach If-None-Match for polled GET collections
  if (method === 'GET' && eTagCache.has(endpoint)) {
    requestHeaders['If-None-Match'] = eTagCache.get(endpoint);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  // A.7 item 3: Treat 304 as a successful read, not a failure
  if (response.status === 304) {
    return { notModified: true, etag: eTagCache.get(endpoint) };
  }

  // Store response ETag if emitted by the service
  const responseEtag = response.headers.get('ETag');
  if (responseEtag) {
    eTagCache.set(endpoint, responseEtag);
  }

  if (response.ok) {
    const data = await response.json();
    return { data, etag: responseEtag };
  }

  // A.6 item 1: Parse error responses as RFC 9457 Problem Details
  let problemDetail;
  try {
    problemDetail = await response.json();
  } catch {
    problemDetail = {
      status: response.status,
      title: response.statusText,
      detail: 'An unexpected network response was received.',
    };
  }

  // A.3 item 2: Differentiate 401, 403, and 404
  if (response.status === 401) {
    clearActiveSession();
    const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/login?returnTo=${returnTo}`;
    throw { ...problemDetail, kind: 'unauthenticated' };
  }

  if (response.status === 403) {
    throw { ...problemDetail, kind: 'forbidden' };
  }

  if (response.status === 404) {
    throw { ...problemDetail, kind: 'not_found' };
  }

  if (response.status === 412) {
    throw { ...problemDetail, kind: 'precondition_failed' };
  }

  throw problemDetail;
}

// Domain API Functions
export const api = {
  getCourts: () => apiRequest('/v1/courts'),
  getCourtById: (courtId) => apiRequest(`/v1/courts/${courtId}`),
  createBooking: (payload) =>
    apiRequest('/v1/bookings', {
      method: 'POST',
      headers: { 'Idempotency-Key': crypto.randomUUID() },
      body: payload,
    }),
  getBookingById: (bookingId) => apiRequest(`/v1/bookings/${bookingId}`),
  cancelBooking: (bookingId, etag) =>
    apiRequest(`/v1/bookings/${bookingId}/cancellation`, {
      method: 'POST',
      ifMatch: etag,
    }),
};