ALTER TABLE checkout_intents ADD COLUMN IF NOT EXISTS request_key uuid;
CREATE UNIQUE INDEX IF NOT EXISTS checkout_request_once ON checkout_intents(user_id,request_key) WHERE request_key IS NOT NULL;
CREATE TABLE IF NOT EXISTS billing_inbox (
  event_id text PRIMARY KEY,
  payload_hash text NOT NULL,
  event_type text NOT NULL,
  payment_id text,
  subscription_id text,
  state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','processing','done','review')),
  attempts integer NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL DEFAULT now(),
  lease_token uuid,
  lease_until timestamptz,
  last_error_code text,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);
CREATE INDEX IF NOT EXISTS billing_inbox_due ON billing_inbox(available_at) WHERE state IN ('pending','processing');
CREATE TABLE IF NOT EXISTS operation_heartbeats (name text PRIMARY KEY, completed_at timestamptz NOT NULL, details jsonb NOT NULL DEFAULT '{}');
