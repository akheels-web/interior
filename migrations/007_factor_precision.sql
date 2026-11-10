-- Assurance now uses explicit records; preserve full DB precision when invalidating old records.
CREATE OR REPLACE FUNCTION record_mfa_enrollment() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."twoFactorEnabled" IS DISTINCT FROM OLD."twoFactorEnabled" THEN
    UPDATE app_accounts SET mfa_since=CASE WHEN NEW."twoFactorEnabled" THEN clock_timestamp() ELSE NULL END WHERE user_id=NEW.id;
  END IF;
  RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION invalidate_rotated_factor() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.secret IS DISTINCT FROM OLD.secret THEN
    UPDATE app_accounts SET mfa_since=clock_timestamp() WHERE user_id=NEW."userId";
  END IF;
  RETURN NEW;
END $$;
