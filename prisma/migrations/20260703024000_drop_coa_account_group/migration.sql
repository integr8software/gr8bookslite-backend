ALTER TABLE "default_chart_accounts"
  DROP COLUMN IF EXISTS "account_group";

ALTER TABLE "chart_accounts"
  DROP COLUMN IF EXISTS "account_group";
