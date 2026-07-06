ALTER TABLE "default_chart_accounts"
  ADD COLUMN IF NOT EXISTS "account_group" VARCHAR(50);

ALTER TABLE "chart_accounts"
  ADD COLUMN IF NOT EXISTS "account_group" VARCHAR(50);
