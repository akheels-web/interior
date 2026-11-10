ALTER TABLE checkout_intents ADD COLUMN IF NOT EXISTS provider_checked_at timestamptz;
ALTER TABLE checkout_intents ADD COLUMN IF NOT EXISTS provider_check_error text;
