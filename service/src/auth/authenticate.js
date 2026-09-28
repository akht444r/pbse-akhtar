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
    const p = principalFrom(claims);
    
    // Ambil payload baik dari claims langsung maupun claims.payload
    const payload = claims?.payload || claims;
    const facId = payload?.facility_id || payload?.facilityId || p?.facilityId || p?.facility_id;

    // Buat objek baru (tidak mutate objek lama agar kebal Object.freeze)
    req.principal = {
      ...p,
      facilityId: facId,
      facility_id: facId,
    };

    return next();
  } catch (err) {
    console.error('[AUTH ERROR]:', err.message);
    return unauthorized(res, 'invalid_token');
  }
}