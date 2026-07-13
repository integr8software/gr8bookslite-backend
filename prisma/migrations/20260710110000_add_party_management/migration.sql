-- CreateEnum
CREATE TYPE "PartyClassification" AS ENUM ('INDIVIDUAL', 'NON_INDIVIDUAL');

-- CreateEnum
CREATE TYPE "PartyType" AS ENUM ('VENDOR', 'CUSTOMER', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "PartyStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "PartyVatRegistrationType" AS ENUM ('VAT_REGISTERED', 'ZERO_RATED', 'NON_VAT', 'EXEMPT', 'CAPITAL_GOODS', 'OTHER_THAN_CAPITAL_GOODS', 'SERVICES');

-- CreateTable
CREATE TABLE "parties" (
    "id" BIGSERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "term_id" BIGINT,
    "party_code_no" VARCHAR(80) NOT NULL,
    "classification" "PartyClassification" NOT NULL,
    "party_types" "PartyType"[] NOT NULL,
    "status" "PartyStatus" NOT NULL DEFAULT 'ACTIVE',
    "party_name" VARCHAR(255),
    "trade_name" VARCHAR(255),
    "first_name" VARCHAR(120),
    "middle_name" VARCHAR(120),
    "last_name" VARCHAR(120),
    "suffix_name" VARCHAR(40),
    "default_receivable_account_id" BIGINT,
    "customer_advance_account_id" BIGINT,
    "default_payable_account_id" BIGINT,
    "vendor_advance_account_id" BIGINT,
    "employee_advance_account_id" BIGINT,
    "employee_payable_account_id" BIGINT,
    "tin" VARCHAR(20),
    "vat_registration_type" "PartyVatRegistrationType",
    "atc_code" VARCHAR(40),
    "email" VARCHAR(255),
    "contact_no" VARCHAR(40),
    "created_by_user_id" INTEGER,
    "updated_by_user_id" INTEGER,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "party_addresses" (
    "id" BIGSERIAL NOT NULL,
    "party_id" BIGINT NOT NULL,
    "address_name" VARCHAR(120) NOT NULL,
    "address_line_1" VARCHAR(255) NOT NULL,
    "address_line_2" VARCHAR(255) NOT NULL,
    "barangay" VARCHAR(120),
    "barangay_code" VARCHAR(30),
    "city_municipality" VARCHAR(120),
    "city_municipality_code" VARCHAR(30),
    "province" VARCHAR(120),
    "province_code" VARCHAR(30),
    "region" VARCHAR(120),
    "region_code" VARCHAR(30),
    "is_billing" BOOLEAN NOT NULL DEFAULT false,
    "is_building" BOOLEAN NOT NULL DEFAULT false,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_delivery" BOOLEAN NOT NULL DEFAULT false,
    "is_foreign" BOOLEAN NOT NULL DEFAULT false,
    "is_home" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "party_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "parties_company_code_key" ON "parties"("company_id", "party_code_no");

-- CreateIndex
CREATE INDEX "parties_company_id_idx" ON "parties"("company_id");

-- CreateIndex
CREATE INDEX "parties_company_status_idx" ON "parties"("company_id", "status");

-- CreateIndex
CREATE INDEX "parties_company_classification_idx" ON "parties"("company_id", "classification");

-- CreateIndex
CREATE INDEX "parties_term_id_idx" ON "parties"("term_id");

-- CreateIndex
CREATE INDEX "parties_default_receivable_account_id_idx" ON "parties"("default_receivable_account_id");

-- CreateIndex
CREATE INDEX "parties_customer_advance_account_id_idx" ON "parties"("customer_advance_account_id");

-- CreateIndex
CREATE INDEX "parties_default_payable_account_id_idx" ON "parties"("default_payable_account_id");

-- CreateIndex
CREATE INDEX "parties_vendor_advance_account_id_idx" ON "parties"("vendor_advance_account_id");

-- CreateIndex
CREATE INDEX "parties_employee_advance_account_id_idx" ON "parties"("employee_advance_account_id");

-- CreateIndex
CREATE INDEX "parties_employee_payable_account_id_idx" ON "parties"("employee_payable_account_id");

-- CreateIndex
CREATE INDEX "party_addresses_party_id_idx" ON "party_addresses"("party_id");

-- AddForeignKey
ALTER TABLE "parties" ADD CONSTRAINT "parties_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parties" ADD CONSTRAINT "parties_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parties" ADD CONSTRAINT "parties_default_receivable_account_id_fkey" FOREIGN KEY ("default_receivable_account_id") REFERENCES "chart_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parties" ADD CONSTRAINT "parties_customer_advance_account_id_fkey" FOREIGN KEY ("customer_advance_account_id") REFERENCES "chart_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parties" ADD CONSTRAINT "parties_default_payable_account_id_fkey" FOREIGN KEY ("default_payable_account_id") REFERENCES "chart_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parties" ADD CONSTRAINT "parties_vendor_advance_account_id_fkey" FOREIGN KEY ("vendor_advance_account_id") REFERENCES "chart_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parties" ADD CONSTRAINT "parties_employee_advance_account_id_fkey" FOREIGN KEY ("employee_advance_account_id") REFERENCES "chart_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parties" ADD CONSTRAINT "parties_employee_payable_account_id_fkey" FOREIGN KEY ("employee_payable_account_id") REFERENCES "chart_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "party_addresses" ADD CONSTRAINT "party_addresses_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
