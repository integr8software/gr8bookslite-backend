-- Convert COA account groups from a single label to a JSON array of labels.
ALTER TABLE "chart_accounts"
  ALTER COLUMN "account_group" TYPE JSONB
  USING CASE
    WHEN "account_group" IS NULL THEN NULL
    WHEN btrim("account_group") = '' THEN NULL
    ELSE jsonb_build_array("account_group")
  END;

-- Remove legacy platform/default mapping tables. Company COA rows now carry
-- system group tags directly in chart_accounts.account_group.
DROP TABLE IF EXISTS "company_default_accounts";
DROP TABLE IF EXISTS "default_accounts";
DROP TABLE IF EXISTS "default_chart_accounts";

-- The former company-maintained template records become the Default Accounts
-- table. The fields are intentionally retained.
ALTER TABLE "default_account_templates" RENAME TO "default_accounts";

ALTER INDEX IF EXISTS "default_account_templates_company_type_name_key"
  RENAME TO "default_accounts_company_type_name_key";
ALTER INDEX IF EXISTS "default_account_templates_company_status_idx"
  RENAME TO "default_accounts_company_status_idx";
ALTER INDEX IF EXISTS "default_account_templates_expense_coa_id_idx"
  RENAME TO "default_accounts_expense_coa_id_idx";
ALTER INDEX IF EXISTS "default_account_templates_revenue_coa_id_idx"
  RENAME TO "default_accounts_revenue_coa_id_idx";
ALTER INDEX IF EXISTS "default_account_templates_asset_coa_id_idx"
  RENAME TO "default_accounts_asset_coa_id_idx";
ALTER INDEX IF EXISTS "default_account_templates_accumulated_depreciation_coa_id_idx"
  RENAME TO "default_accounts_accumulated_depreciation_coa_id_idx";

ALTER TABLE "default_accounts"
  RENAME CONSTRAINT "default_account_templates_pkey" TO "default_accounts_pkey";
ALTER TABLE "default_accounts"
  RENAME CONSTRAINT "default_account_templates_company_id_fkey" TO "default_accounts_company_id_fkey";
ALTER TABLE "default_accounts"
  RENAME CONSTRAINT "default_account_templates_expense_coa_id_fkey" TO "default_accounts_expense_coa_id_fkey";
ALTER TABLE "default_accounts"
  RENAME CONSTRAINT "default_account_templates_revenue_coa_id_fkey" TO "default_accounts_revenue_coa_id_fkey";
ALTER TABLE "default_accounts"
  RENAME CONSTRAINT "default_account_templates_asset_coa_id_fkey" TO "default_accounts_asset_coa_id_fkey";
ALTER TABLE "default_accounts"
  RENAME CONSTRAINT "default_account_templates_accumulated_depreciation_coa_id_fkey" TO "default_accounts_accumulated_depreciation_coa_id_fkey";
