import { createRemoteJWKSet, jwtVerify } from 'jose';
import { config } from '../config.js';

let jwks;

function getJWKS() {
  if (!jwks && config.oidcJwksUri) {
    jwks = createRemoteJWKSet(new URL(config.oidcJwksUri));
  }
  return jwks;
}

export async function verifyAccessToken(rawToken) {
  const keyset = getJWKS();
  const { payload } = await jwtVerify(rawToken, keyset, {
    issuer: config.oidcIssuer,
    audience: config.oidcAudience,
    algorithms: ['RS256'], // Explicit allowlist to prevent the 'none' algorithm bypass
    clockTolerance: 5,     // 5 seconds tolerance for minor clock skew
  });
  return payload;
}