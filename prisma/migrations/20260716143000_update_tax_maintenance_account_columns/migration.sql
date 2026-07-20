-- DropForeignKey
ALTER TABLE "tax_maintenance"
  DROP CONSTRAINT IF EXISTS "tax_maintenance_vat_payable_account_id_fkey",
  DROP CONSTRAINT IF EXISTS "tax_maintenance_deferred_input_tax_account_id_fkey",
  DROP CONSTRAINT IF EXISTS "tax_maintenance_deferred_output_vat_account_id_fkey";

-- DropIndex
DROP INDEX IF EXISTS "tax_maintenance_vat_payable_account_id_idx";
DROP INDEX IF EXISTS "tax_maintenance_deferred_input_tax_account_id_idx";
DROP INDEX IF EXISTS "tax_maintenance_deferred_output_vat_account_id_idx";

-- RenameColumn
ALTER TABLE "tax_maintenance"
  RENAME COLUMN "deferred_output_vat_account_id" TO "deferred_vat_account_id";

-- AlterTable
ALTER TABLE "tax_maintenance"
  DROP COLUMN "vat_payable_account_id",
  DROP COLUMN "deferred_input_tax_account_id",
  ADD COLUMN "expanded_withholding_tax_account_id" BIGINT,
  ADD COLUMN "creditable_withholding_tax_account_id" BIGINT,
  ADD COLUMN "withholding_vatable_tax_account_id" BIGINT,
  ADD COLUMN "final_withholding_tax_account_id" BIGINT;

-- CreateIndex
CREATE INDEX "tax_maintenance_deferred_vat_account_id_idx" ON "tax_maintenance"("deferred_vat_account_id");

-- CreateIndex
CREATE INDEX "tax_maintenance_expanded_withholding_tax_account_id_idx" ON "tax_maintenance"("expanded_withholding_tax_account_id");

-- CreateIndex
CREATE INDEX "tax_maintenance_creditable_withholding_tax_account_id_idx" ON "tax_maintenance"("creditable_withholding_tax_account_id");

-- CreateIndex
CREATE INDEX "tax_maintenance_withholding_vatable_tax_account_id_idx" ON "tax_maintenance"("withholding_vatable_tax_account_id");

-- CreateIndex
CREATE INDEX "tax_maintenance_final_withholding_tax_account_id_idx" ON "tax_maintenance"("final_withholding_tax_account_id");

-- AddForeignKey
ALTER TABLE "tax_maintenance" ADD CONSTRAINT "tax_maintenance_deferred_vat_account_id_fkey" FOREIGN KEY ("deferred_vat_account_id") REFERENCES "chart_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_maintenance" ADD CONSTRAINT "tax_maintenance_expanded_withholding_tax_account_id_fkey" FOREIGN KEY ("expanded_withholding_tax_account_id") REFERENCES "chart_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_maintenance" ADD CONSTRAINT "tax_maintenance_creditable_withholding_tax_account_id_fkey" FOREIGN KEY ("creditable_withholding_tax_account_id") REFERENCES "chart_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_maintenance" ADD CONSTRAINT "tax_maintenance_withholding_vatable_tax_account_id_fkey" FOREIGN KEY ("withholding_vatable_tax_account_id") REFERENCES "chart_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_maintenance" ADD CONSTRAINT "tax_maintenance_final_withholding_tax_account_id_fkey" FOREIGN KEY ("final_withholding_tax_account_id") REFERENCES "chart_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
