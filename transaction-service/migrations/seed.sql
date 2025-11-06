-- migrations/seed.sql
INSERT INTO transactions (account_id, amount, txn_type, counterparty, reference, balance_after)
VALUES
(1, 10000.00, 'DEPOSIT', 'Seed deposit', 'seed-1', 10000.00)
ON CONFLICT DO NOTHING;

-- 002_create_idempotency_table.sql
-- Create an idempotency table for /transfer and other idempotent endpoints

CREATE TABLE IF NOT EXISTS idempotency_keys (
  idempotency_key TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  request_hash TEXT,                 -- optional: store hash of request body
  response JSONB,                    -- cached response for idempotent replay
  status TEXT NOT NULL DEFAULT 'PENDING', -- e.g. PENDING, IN_PROGRESS, COMPLETED, FAILED
  owner_service TEXT,                -- optional: which service created it
  expires_at TIMESTAMPTZ             -- expire keys after TTL
);

-- quick index for expiry cleanup
CREATE INDEX IF NOT EXISTS idx_idempotency_expires_at ON idempotency_keys (expires_at);

-- (optional) small maintenance function to purge expired keys — you can run via cron/pg_cron or app
CREATE OR REPLACE FUNCTION purge_expired_idempotency_keys() RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM idempotency_keys WHERE expires_at IS NOT NULL AND expires_at < now();
END;
$$;