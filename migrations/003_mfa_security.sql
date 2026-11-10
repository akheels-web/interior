ALTER TABLE app_accounts ADD COLUMN IF NOT EXISTS mfa_since timestamptz;
CREATE OR REPLACE FUNCTION record_mfa_enrollment() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."twoFactorEnabled" IS DISTINCT FROM OLD."twoFactorEnabled" THEN
    UPDATE app_accounts SET mfa_since=CASE WHEN NEW."twoFactorEnabled" THEN date_trunc('milliseconds',clock_timestamp()) ELSE NULL END WHERE user_id=NEW.id;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS user_mfa_enrollment ON "user";
CREATE TRIGGER user_mfa_enrollment AFTER UPDATE OF "twoFactorEnabled" ON "user" FOR EACH ROW EXECUTE FUNCTION record_mfa_enrollment();
