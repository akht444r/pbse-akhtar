import { verifyAccessToken } from './verify.js';
import { principalFrom } from './principal.js';
import { unauthorized } from '../problem.js';

export async function authenticate(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    req.principal = null;
    return next();
  }

  const rawToken = header.slice(7).trim();

  try {
    const claims = await verifyAccessToken(rawToken);
    req.principal = principalFrom(claims);
    return next();
  } catch (err) {
    // Malformed, expired, invalid signature, or wrong issuer/audience
    return unauthorized(res, 'invalid_token');
  }
}