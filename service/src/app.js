import express from 'express';
import dotenv from 'dotenv';
import { problem } from './problem.js';
import { courtsRouter } from './routes/courts.js';
import { bookingsRouter } from './routes/bookings.js';

dotenv.config();

// Refuse to boot if required environment variables are missing
const requiredVars = ['DATABASE_URL', 'PORT'];
for (const k of requiredVars) {
  if (!process.env[k]) {
    console.error(`Missing required environment variable: ${k}`);
    process.exit(1);
  }
}

const app = express();
app.use(express.json());

// Platform healthcheck: strictly no database or dependency checks
app.get('/health', (req, res) => {
  return res.status(200).json({ status: 'ok' });
});

app.use('/v1/courts', courtsRouter);
app.use('/v1/bookings', bookingsRouter);

// Global fallback handler: logs details internally, returns safe RFC 9457 500
app.use((err, req, res, next) => {
  console.error('[Internal Error]', err);
  return problem(res, 500, 'internal-error');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Service running on port ${PORT}`);
});