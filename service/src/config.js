import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: Number(process.env.PORT) || 3000,
  databaseUrl: process.env.DATABASE_URL,
  logLevel: process.env.LOG_LEVEL || 'info',
  oidcIssuer: process.env.OIDC_ISSUER,
  oidcJwksUri: process.env.OIDC_JWKS_URI,
  oidcAudience: process.env.OIDC_AUDIENCE,
};

const required = ['DATABASE_URL', 'OIDC_ISSUER', 'OIDC_JWKS_URI', 'OIDC_AUDIENCE'];
const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  throw new Error(`[Startup Guard] Missing required environment variables: ${missing.join(', ')}`);
}