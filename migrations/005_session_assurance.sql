CREATE TABLE IF NOT EXISTS session_mfa (
  session_id text PRIMARY KEY REFERENCES "session"(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  verified_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE OR REPLACE FUNCTION invalidate_rotated_factor() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.secret IS DISTINCT FROM OLD.secret THEN
    UPDATE app_accounts SET mfa_since=date_trunc('milliseconds',clock_timestamp()) WHERE user_id=NEW."userId";
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS two_factor_rotated ON "twoFactor";
CREATE TRIGGER two_factor_rotated AFTER UPDATE OF secret ON "twoFactor" FOR EACH ROW EXECUTE FUNCTION invalidate_rotated_factor();
