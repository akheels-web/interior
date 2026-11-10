CREATE TABLE IF NOT EXISTS plan_assets (
  id uuid PRIMARY KEY,
  owner_id text NOT NULL REFERENCES app_accounts(user_id),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source_hash text NOT NULL,
  stored_hash text NOT NULL,
  object_key text UNIQUE NOT NULL,
  byte_size integer NOT NULL CHECK(byte_size>0 AND byte_size<=4000000),
  width integer NOT NULL,
  height integer NOT NULL,
  state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','ready','deleting')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id,source_hash)
);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS source_asset_id uuid REFERENCES plan_assets(id);
CREATE INDEX IF NOT EXISTS plan_assets_orphans ON plan_assets(updated_at);
