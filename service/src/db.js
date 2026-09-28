// db.js — the single PostgreSQL connection pool, shared by every store file.
// Kept separate from app.js so that routes/store files can import it
// without creating a circular dependency with app.js (which imports routes).
import pg from 'pg';
import dotenv from 'dotenv';

// Loaded here (not just in app.js) because ES module imports are
// evaluated before app.js's own top-level code runs — by the time
// app.js calls dotenv.config(), this file would already have read
// process.env.DATABASE_URL as undefined otherwise.
dotenv.config();

export const db = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
