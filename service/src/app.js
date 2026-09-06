import express from 'express';
import dotenv from 'dotenv';
import pg from 'pg';
import { problem } from './problem.js';

dotenv.config();

// Refuse to boot if required environment variables are missing
const requiredVars = ['DATABASE_URL', 'PORT'];
for (const k of requiredVars) {
  if (!process.env[k]) {
    console.error(`Missing required environment variable: ${k}`);
    process.exit(1);
  }
}

// PostgreSQL connection pool
export const db = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const app = express();
app.use(express.json());

// Platform healthcheck: strictly no database or dependency checks
app.get('/health', (req, res) => {
  return res.status(200).json({ status: 'ok' });
});

// Global fallback handler: logs details internally, returns safe RFC 9457 500
app.use((err, req, res, next) => {
  console.error('[Internal Error]', err);
  return problem(res, 500, 'internal-error');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Service running on port ${PORT}`);
});