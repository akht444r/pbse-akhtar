export function principalFrom(claims) {
  const scopeString = typeof claims.scope === 'string' ? claims.scope : '';
  const scopes = scopeString.split(' ').filter(Boolean);

  // Distinguish client_credentials service tokens from interactive users
  const isService = claims.sub === claims.azp || Boolean(claims.client_id && !claims.sub);

  return {
    subject: claims.sub,
    kind: isService ? 'service' : 'user',
    scopes,
    facilityId: claims.facility_id || null, // For tenant/facility boundaries
    tokenId: claims.jti || null,
  };
}