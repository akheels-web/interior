ALTER TABLE billing_periods ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'provider' CHECK(source IN ('provider','offline_development_fixture','integration_fixture'));
UPDATE billing_periods SET source='offline_development_fixture' WHERE provider_invoice_id LIKE 'offline-development:%';
UPDATE billing_periods SET source='integration_fixture' WHERE provider_invoice_id LIKE 'offline-test:%';
