CREATE TYPE "ItemCategoryAccountingSetupMode" AS ENUM ('INHERIT', 'AUTO_CREATE');

CREATE TYPE "ItemCategoryStatus" AS ENUM ('ACTIVE', 'INACTIVE');

CREATE TABLE "item_categories" (
  "id" BIGSERIAL NOT NULL,
  "company_id" INTEGER NOT NULL,
  "parent_id" BIGINT,
  "code" VARCHAR(30) NOT NULL,
  "name" VARCHAR(150) NOT NULL,
  "description" VARCHAR(500),
  "accounting_setup_mode" "ItemCategoryAccountingSetupMode" NOT NULL DEFAULT 'AUTO_CREATE',
  "inventory_account_id" BIGINT,
  "sales_account_id" BIGINT,
  "cost_of_sales_account_id" BIGINT,
  "expense_account_id" BIGINT,
  "allow_sub_category" BOOLEAN NOT NULL DEFAULT true,
  "parent_inactive_source_ids" JSONB,
  "status_before_parent_inactive" "ItemCategoryStatus",
  "status" "ItemCategoryStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_by_user_id" INTEGER,
  "updated_by_user_id" INTEGER,
  "deleted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "item_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "item_categories_company_code_key" ON "item_categories"("company_id", "code");
CREATE UNIQUE INDEX "item_categories_company_parent_name_key" ON "item_categories"("company_id", "parent_id", "name") WHERE "parent_id" IS NOT NULL AND "deleted_at" IS NULL;
CREATE UNIQUE INDEX "item_categories_company_root_name_key" ON "item_categories"("company_id", "name") WHERE "parent_id" IS NULL AND "deleted_at" IS NULL;
CREATE INDEX "item_categories_company_id_idx" ON "item_categories"("company_id");
CREATE INDEX "item_categories_company_status_idx" ON "item_categories"("company_id", "status");
CREATE INDEX "item_categories_company_accounting_setup_mode_idx" ON "item_categories"("company_id", "accounting_setup_mode");
CREATE INDEX "item_categories_company_parent_name_idx" ON "item_categories"("company_id", "parent_id", "name");
CREATE INDEX "item_categories_parent_id_idx" ON "item_categories"("parent_id");

ALTER TABLE "item_categories" ADD CONSTRAINT "item_categories_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "item_categories" ADD CONSTRAINT "item_categories_parent_id_fkey"
  FOREIGN KEY ("parent_id") REFERENCES "item_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "item_categories" ADD CONSTRAINT "item_categories_inventory_account_id_fkey"
  FOREIGN KEY ("inventory_account_id") REFERENCES "chart_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "item_categories" ADD CONSTRAINT "item_categories_sales_account_id_fkey"
  FOREIGN KEY ("sales_account_id") REFERENCES "chart_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "item_categories" ADD CONSTRAINT "item_categories_cost_of_sales_account_id_fkey"
  FOREIGN KEY ("cost_of_sales_account_id") REFERENCES "chart_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "item_categories" ADD CONSTRAINT "item_categories_expense_account_id_fkey"
  FOREIGN KEY ("expense_account_id") REFERENCES "chart_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
