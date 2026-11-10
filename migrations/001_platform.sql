-- Better Auth owns its core schema via getMigrations(auth.options), before this migration.
CREATE TABLE IF NOT EXISTS app_accounts (
  user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE RESTRICT,
  role text NOT NULL DEFAULT 'user' CHECK(role IN ('user','super_admin')),
  status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','suspended')),
  addon_credits integer NOT NULL DEFAULT 0 CHECK(addon_credits>=0),
  active_period_id uuid,
  subscription_id text UNIQUE,
  subscription_status text NOT NULL DEFAULT 'none',
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS billing_periods (
  id uuid PRIMARY KEY,
  user_id text NOT NULL REFERENCES app_accounts(user_id),
  provider_invoice_id text NOT NULL UNIQUE,
  provider_payment_id text NOT NULL UNIQUE,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL CHECK(period_end>period_start),
  monthly_used integer NOT NULL DEFAULT 0 CHECK(monthly_used BETWEEN 0 AND 10),
  status text NOT NULL DEFAULT 'paid' CHECK(status IN ('paid','reversed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id,period_start)
);
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY,
  owner_id text NOT NULL REFERENCES app_accounts(user_id),
  name text NOT NULL,
  client text NOT NULL DEFAULT '',
  document jsonb NOT NULL,
  revision integer NOT NULL DEFAULT 1 CHECK(revision>=1),
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS projects_owner_updated ON projects(owner_id,updated_at DESC,id);
CREATE TABLE IF NOT EXISTS creation_requests (
  user_id text NOT NULL REFERENCES app_accounts(user_id),
  idempotency_key uuid NOT NULL,
  request_hash text NOT NULL,
  project_id uuid NOT NULL REFERENCES projects(id),
  credit_source text NOT NULL CHECK(credit_source IN ('monthly','extra')),
  period_id uuid REFERENCES billing_periods(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,idempotency_key)
);
CREATE TABLE IF NOT EXISTS checkout_intents (
  id uuid PRIMARY KEY,
  user_id text NOT NULL REFERENCES app_accounts(user_id),
  kind text NOT NULL CHECK(kind IN ('subscription','addon')),
  provider_id text UNIQUE,
  state text NOT NULL DEFAULT 'creating' CHECK(state IN ('creating','ready','failed','completed')),
  amount integer NOT NULL CHECK(amount IN (149900,29900)),
  eligible_period_id uuid REFERENCES billing_periods(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS checkout_intents_owner ON checkout_intents(user_id,created_at DESC);
CREATE TABLE IF NOT EXISTS billing_payments (
  provider_payment_id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES app_accounts(user_id),
  intent_id uuid NOT NULL REFERENCES checkout_intents(id),
  kind text NOT NULL CHECK(kind IN ('subscription','addon')),
  provider_order_id text,
  provider_invoice_id text UNIQUE,
  amount integer NOT NULL,
  status text NOT NULL CHECK(status IN ('captured','reversed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS credit_grants (
  source_key text PRIMARY KEY,
  user_id text NOT NULL REFERENCES app_accounts(user_id),
  quantity integer NOT NULL CHECK(quantity>0),
  remaining integer NOT NULL CHECK(remaining>=0 AND remaining<=quantity),
  reversed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS billing_addon_order_once ON billing_payments(provider_order_id) WHERE kind='addon';
CREATE INDEX IF NOT EXISTS credit_grants_owner ON credit_grants(user_id,created_at,source_key);
CREATE TABLE IF NOT EXISTS billing_events (
  provider_event_id text PRIMARY KEY,
  event_type text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS admin_audit (
  id uuid PRIMARY KEY,
  actor_id text NOT NULL REFERENCES app_accounts(user_id),
  target_id text NOT NULL REFERENCES app_accounts(user_id),
  action text NOT NULL,
  reason text NOT NULL,
  credits integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_audit_target ON admin_audit(target_id,created_at DESC);
CREATE TABLE IF NOT EXISTS api_rate_limits (
  bucket text PRIMARY KEY,
  count integer NOT NULL,
  expires_at timestamptz NOT NULL
);
