DROP TABLE IF EXISTS idempotency_keys;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS courts;

-- Courts resource
CREATE TABLE courts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    hourly_rate INTEGER NOT NULL,
    is_available BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bookings resource
CREATE TABLE bookings (
    id TEXT PRIMARY KEY,
    court_id TEXT NOT NULL REFERENCES courts(id),
    user_id TEXT NOT NULL,
    slot_start TIMESTAMPTZ NOT NULL,
    slot_end TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'confirmed',
    total_fee INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotency storage required by the spec
CREATE TABLE idempotency_keys (
    key UUID PRIMARY KEY,
    body_hash TEXT NOT NULL,
    status_code INTEGER,
    response_body JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);