ALTER TABLE "default_chart_accounts"
  ALTER COLUMN "description" TYPE VARCHAR(500);

ALTER TABLE "chart_accounts"
  ALTER COLUMN "description" TYPE VARCHAR(500);
