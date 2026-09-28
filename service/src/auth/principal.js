export function principalFrom(claims) {
  const scopeString = typeof claims.scope === 'string' ? claims.scope : '';
  const scopes = scopeString.split(' ').filter(Boolean);

  const isService = claims.sub === claims.azp || Boolean(claims.client_id && !claims.sub);

  return {
    subject: claims.sub,
    kind: isService ? 'service' : 'user',
    scopes,
    facilityId: claims.facility_id || claims.facilityId || null,
    facility_id: claims.facility_id || claims.facilityId || null,
    tokenId: claims.jti || null,
  };
}