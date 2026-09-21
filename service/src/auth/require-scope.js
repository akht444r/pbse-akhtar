import { unauthorized, forbidden } from '../problem.js';

export function requireScope(...needed) {
  return function (req, res, next) {
    const principal = req.principal;

    // Layer 1 gate check: if endpoint requires a scope, caller MUST be authenticated
    if (!principal) {
      return unauthorized(res);
    }

    // Layer 2 scope check: principal must have all required scopes
    const hasAllScopes = needed.every((scope) => principal.scopes.includes(scope));
    if (!hasAllScopes) {
      return forbidden(res, needed);
    }

    return next();
  };
}