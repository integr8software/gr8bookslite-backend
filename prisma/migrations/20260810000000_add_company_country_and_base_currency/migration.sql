-- Add the company's legal country and accounting base currency.
-- Existing companies retain the current product defaults until they are updated.
ALTER TABLE "companies"
  ADD COLUMN "country_code" VARCHAR(2) NOT NULL DEFAULT 'PH',
  ADD COLUMN "base_currency_code" VARCHAR(3) NOT NULL DEFAULT 'PHP';
