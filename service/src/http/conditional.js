// service/src/http/conditional.js — A.7: answer conditional reads explicitly.
//
// Why not rely on Express's built-in 304? A browser's fetch() adds
// "Cache-Control: no-cache" whenever the page sets If-None-Match by hand,
// and Express treats that header as "always send the full response". So the
// default behaviour never produces a 304 for our client. Comparing the
// validator ourselves is what makes the poll cycle return 304 when nothing
// has changed.
import crypto from 'node:crypto';

function etagFor(body) {
  const hash = crypto.createHash('sha1').update(body).digest('base64url').slice(0, 27);
  return `W/"${hash}"`;
}

// Weak comparison (RFC 9110 §8.8.3.2): the W/ prefix is ignored.
function matches(ifNoneMatch, etag) {
  if (!ifNoneMatch) return false;
  if (ifNoneMatch.trim() === '*') return true;
  const bare = (token) => token.trim().replace(/^W\//, '');
  return ifNoneMatch.split(',').some((token) => bare(token) === bare(etag));
}

// The ETag a payload will carry, so a write can be checked against the same value a read handed out.
export function etagOf(payload) {
  return etagFor(JSON.stringify(payload));
}

// A.8: true when the caller sent If-Match and it no longer describes the current version.
// (Weak comparison is deliberate: our validators are weak ETags.)
export function ifMatchFails(req, currentEtag) {
  const header = req.headers['if-match'];
  if (!header || header.trim() === '*') return false;
  return !matches(header, currentEtag);
}

export function sendJsonConditional(req, res, payload) {
  const body = JSON.stringify(payload);
  const etag = etagFor(body);
  res.set('ETag', etag);
  // The body depends on who is asking, so shared caches must not reuse it,
  // and browsers must revalidate rather than serve it blindly.
  res.set('Cache-Control', 'private, no-cache');
  if (matches(req.headers['if-none-match'], etag)) {
    return res.status(304).end();
  }
  return res.status(200).type('application/json').send(body);
}
