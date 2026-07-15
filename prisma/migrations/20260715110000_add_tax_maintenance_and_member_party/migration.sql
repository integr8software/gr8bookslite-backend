-- AlterEnum
ALTER TYPE "PartyType" ADD VALUE IF NOT EXISTS 'MEMBER';

-- CreateEnum
CREATE TYPE "TaxMaintenanceStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "tax_maintenance" (
    "id" BIGSERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "percentage" DECIMAL(7,4) NOT NULL DEFAULT 0,
    "input_vat_account_id" BIGINT,
    "output_vat_account_id" BIGINT,
    "vat_payable_account_id" BIGINT,
    "deferred_input_tax_account_id" BIGINT,
    "deferred_output_vat_account_id" BIGINT,
    "status" "TaxMaintenanceStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_by_user_id" INTEGER,
    "updated_by_user_id" INTEGER,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_maintenance_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "parties" ADD COLUMN "vat_registration_type_id" BIGINT,
ADD COLUMN "honorific" VARCHAR(80),
ADD COLUMN "gender" VARCHAR(40),
ADD COLUMN "civil_status" VARCHAR(40),
ADD COLUMN "nationality" VARCHAR(80);

-- CreateIndex
CREATE UNIQUE INDEX "tax_maintenance_company_name_key" ON "tax_maintenance"("company_id", "name");

-- CreateIndex
CREATE INDEX "tax_maintenance_company_status_idx" ON "tax_maintenance"("company_id", "status");

-- CreateIndex
CREATE INDEX "tax_maintenance_input_vat_account_id_idx" ON "tax_maintenance"("input_vat_account_id");

-- CreateIndex
CREATE INDEX "tax_maintenance_output_vat_account_id_idx" ON "tax_maintenance"("output_vat_account_id");

-- CreateIndex
CREATE INDEX "tax_maintenance_vat_payable_account_id_idx" ON "tax_maintenance"("vat_payable_account_id");

-- CreateIndex
CREATE INDEX "tax_maintenance_deferred_input_tax_account_id_idx" ON "tax_maintenance"("deferred_input_tax_account_id");

-- CreateIndex
CREATE INDEX "tax_maintenance_deferred_output_vat_account_id_idx" ON "tax_maintenance"("deferred_output_vat_account_id");

-- CreateIndex
CREATE INDEX "parties_vat_registration_type_id_idx" ON "parties"("vat_registration_type_id");

-- AddForeignKey
ALTER TABLE "tax_maintenance" ADD CONSTRAINT "tax_maintenance_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_maintenance" ADD CONSTRAINT "tax_maintenance_input_vat_account_id_fkey" FOREIGN KEY ("input_vat_account_id") REFERENCES "chart_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_maintenance" ADD CONSTRAINT "tax_maintenance_output_vat_account_id_fkey" FOREIGN KEY ("output_vat_account_id") REFERENCES "chart_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_maintenance" ADD CONSTRAINT "tax_maintenance_vat_payable_account_id_fkey" FOREIGN KEY ("vat_payable_account_id") REFERENCES "chart_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_maintenance" ADD CONSTRAINT "tax_maintenance_deferred_input_tax_account_id_fkey" FOREIGN KEY ("deferred_input_tax_account_id") REFERENCES "chart_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_maintenance" ADD CONSTRAINT "tax_maintenance_deferred_output_vat_account_id_fkey" FOREIGN KEY ("deferred_output_vat_account_id") REFERENCES "chart_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parties" ADD CONSTRAINT "parties_vat_registration_type_id_fkey" FOREIGN KEY ("vat_registration_type_id") REFERENCES "tax_maintenance"("id") ON DELETE SET NULL ON UPDATE CASCADE;
