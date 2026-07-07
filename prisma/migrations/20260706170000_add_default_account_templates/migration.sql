-- CreateEnum
CREATE TYPE "DefaultAccountTemplateType" AS ENUM ('EXPENSE', 'COLLECTION', 'FIXED_ASSET');

-- CreateTable
CREATE TABLE "default_account_templates" (
    "id" BIGSERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "type" "DefaultAccountTemplateType" NOT NULL,
    "description" VARCHAR(250) NOT NULL,
    "status" "ChartAccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "expense_coa_id" BIGINT,
    "revenue_coa_id" BIGINT,
    "asset_coa_id" BIGINT,
    "accumulated_depreciation_coa_id" BIGINT,
    "created_by_user_id" INTEGER,
    "updated_by_user_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "default_account_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "default_account_templates_company_type_description_key" ON "default_account_templates"("company_id", "type", "description");

-- CreateIndex
CREATE INDEX "default_account_templates_company_status_idx" ON "default_account_templates"("company_id", "status");

-- CreateIndex
CREATE INDEX "default_account_templates_expense_coa_id_idx" ON "default_account_templates"("expense_coa_id");

-- CreateIndex
CREATE INDEX "default_account_templates_revenue_coa_id_idx" ON "default_account_templates"("revenue_coa_id");

-- CreateIndex
CREATE INDEX "default_account_templates_asset_coa_id_idx" ON "default_account_templates"("asset_coa_id");

-- CreateIndex
CREATE INDEX "default_account_templates_accumulated_depreciation_coa_id_idx" ON "default_account_templates"("accumulated_depreciation_coa_id");

-- AddForeignKey
ALTER TABLE "default_account_templates" ADD CONSTRAINT "default_account_templates_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "default_account_templates" ADD CONSTRAINT "default_account_templates_expense_coa_id_fkey" FOREIGN KEY ("expense_coa_id") REFERENCES "chart_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "default_account_templates" ADD CONSTRAINT "default_account_templates_revenue_coa_id_fkey" FOREIGN KEY ("revenue_coa_id") REFERENCES "chart_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "default_account_templates" ADD CONSTRAINT "default_account_templates_asset_coa_id_fkey" FOREIGN KEY ("asset_coa_id") REFERENCES "chart_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "default_account_templates" ADD CONSTRAINT "default_account_templates_accumulated_depreciation_coa_id_fkey" FOREIGN KEY ("accumulated_depreciation_coa_id") REFERENCES "chart_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
