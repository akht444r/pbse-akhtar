import express from 'express';
import { courtsRouter } from './routes/courts.js';
import { bookingsRouter } from './routes/bookings.js';
import { problem } from './problem.js';
import { authenticate } from './auth/authenticate.js'; // 1. Added import

export const app = express();

app.use(express.json());

// Intercept malformed JSON body errors before they default to Express HTML 400
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    if (req.path.startsWith('/v1/bookings')) {
      return problem(res, 422, 'invalid-request-body', {
        detail: 'Malformed or invalid JSON body.',
      });
    }
    return problem(res, 400, 'invalid-request-body', {
      detail: 'Malformed or invalid JSON body.',
    });
  }
  next(err);
});

// Public health check (deliberately public without token)
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));
app.get('/v1/health', (req, res) => res.status(200).json({ status: 'ok' }));

// 2. Layer 1 Global Authenticator (populates req.principal for protected routes)
app.use(authenticate);

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
  if (req.path.startsWith('/v1/bookings')) {
    return problem(res, 409, 'court-unavailable', {
      detail: 'Booking could not be processed due to a conflict.',
    });
  }
  return problem(res, 500, 'internal-error', {
    detail: 'An unexpected internal error occurred.',
  });
});

// Start the server so Schemathesis can connect on port 3000
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Service listening on port ${port}`);
});