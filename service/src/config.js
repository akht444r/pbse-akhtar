import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: Number(process.env.PORT) || 3000,
  databaseUrl: process.env.DATABASE_URL,
  logLevel: process.env.LOG_LEVEL || 'info',
  oidcIssuer: process.env.OIDC_ISSUER || 'https://auth.campus-court.local',
  oidcJwksUri: process.env.OIDC_JWKS_URI || 'http://127.0.0.1:9999/jwks.json',
  oidcAudience: process.env.OIDC_AUDIENCE || 'campus-court-api',
};

const required = ['DATABASE_URL'];
const missing = required.filter((key) => !process.env[key]);

if (!config.oidcIssuer || !config.oidcJwksUri || !config.oidcAudience) {
  missing.push('OIDC_CONFIGS');
}

if (missing.length > 0) {
  throw new Error(`[Startup Guard] Missing required environment variables: ${missing.join(', ')}`);
}