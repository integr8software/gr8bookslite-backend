ALTER TABLE "chart_accounts"
  RENAME COLUMN "report_alias" TO "statement_section";

ALTER TABLE "default_chart_accounts"
  RENAME COLUMN "report_alias" TO "statement_section";

ALTER TABLE "chart_accounts"
  ADD COLUMN "report_alias" VARCHAR(250);

ALTER TABLE "default_chart_accounts"
  ADD COLUMN "report_alias" VARCHAR(250);

UPDATE "chart_accounts"
SET "account_group" = NULL
WHERE "account_group" IS NOT NULL;

UPDATE "default_chart_accounts"
SET "account_group" = NULL
WHERE "account_group" IS NOT NULL;
