/*
  Warnings:

  - A unique constraint covering the columns `[provisioned_company_id]` on the table `user_onboarding_drafts` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "CompanyUnitType" AS ENUM ('HEAD_OFFICE', 'BRANCH', 'SATELLITE');

-- AlterTable
ALTER TABLE "user_onboarding_drafts" ADD COLUMN     "provisioned_company_id" INTEGER;

-- CreateTable
CREATE TABLE "company_units" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "parent_unit_id" INTEGER,
    "type" "CompanyUnitType" NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "display_name" TEXT,
    "tin" TEXT,
    "address" TEXT,
    "contact_number" TEXT,
    "email" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "inherits_company_profile" BOOLEAN NOT NULL DEFAULT false,
    "can_transact_sales" BOOLEAN NOT NULL DEFAULT false,
    "can_hold_inventory" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_units_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "company_units_company_id_idx" ON "company_units"("company_id");

-- CreateIndex
CREATE INDEX "company_units_parent_unit_id_idx" ON "company_units"("parent_unit_id");

-- CreateIndex
CREATE UNIQUE INDEX "company_units_company_id_code_key" ON "company_units"("company_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "user_onboarding_drafts_provisioned_company_id_key" ON "user_onboarding_drafts"("provisioned_company_id");

-- CreateIndex
CREATE INDEX "user_onboarding_drafts_provisioned_company_id_idx" ON "user_onboarding_drafts"("provisioned_company_id");

-- AddForeignKey
ALTER TABLE "company_units" ADD CONSTRAINT "company_units_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_units" ADD CONSTRAINT "company_units_parent_unit_id_fkey" FOREIGN KEY ("parent_unit_id") REFERENCES "company_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_onboarding_drafts" ADD CONSTRAINT "user_onboarding_drafts_provisioned_company_id_fkey" FOREIGN KEY ("provisioned_company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
