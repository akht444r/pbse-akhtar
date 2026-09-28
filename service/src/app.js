import express from 'express';
import { courtsRouter } from './routes/courts.js';
import { bookingsRouter } from './routes/bookings.js';
import { problem } from './problem.js';
import { authenticate } from './auth/authenticate.js';

export const app = express();

// A.4: Strict CORS whitelist configuration (never reflect arbitrary origins)
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  process.env.CLIENT_ORIGIN,
].filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Authorization, Content-Type, Idempotency-Key, If-Match, If-None-Match'
    );
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Expose-Headers', 'ETag, Location');
  }

  // A.4 Item 3: Terminate preflight OPTIONS requests immediately
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

app.use(express.json());

// Intercept malformed JSON body errors before they default to Express HTML 400
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return problem(res, 400, 'invalid-request-body', {
      detail: 'Malformed or invalid JSON body.',
    });
  }
  next(err);
});

// Public health check endpoints
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));
app.get('/v1/health', (req, res) => res.status(200).json({ status: 'ok' }));

// Layer 1 Global Authenticator
app.use(authenticate);

// Mount domain route handlers
app.use('/v1/courts', courtsRouter);
app.use('/v1/bookings', bookingsRouter);

// Global fallback handler returning RFC 9457 Problem Details
app.use((req, res) => {
  return problem(res, 404, 'not-found', {
    detail: `Cannot ${req.method} ${req.path}`,
  });
});

app.use((err, req, res, next) => {
  console.error(err);
  return problem(res, 500, 'internal-error', {
    detail: 'An unexpected internal error occurred.',
  });
});

// Jalankan listen HANYA jika file dieksekusi langsung via CLI, bukan saat di-import oleh testing
if (process.env.NODE_ENV !== 'test') {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Service listening on port ${port}`);
  });
}