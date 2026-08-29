-- CreateEnum
CREATE TYPE "PettyCashVoucherStatus" AS ENUM ('DRAFT', 'FOR_APPROVAL', 'APPROVED', 'POSTED', 'DISAPPROVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PettyCashFundStatus" AS ENUM ('DRAFT', 'FOR_APPROVAL', 'APPROVED', 'POSTED', 'DISAPPROVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PettyCashReplenishmentStatus" AS ENUM ('DRAFT', 'FOR_APPROVAL', 'APPROVED', 'POSTED', 'DISAPPROVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RevolvingFundStatus" AS ENUM ('DRAFT', 'FOR_APPROVAL', 'APPROVED', 'POSTED', 'DISAPPROVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RevolvingFundReplenishmentStatus" AS ENUM ('DRAFT', 'FOR_APPROVAL', 'APPROVED', 'POSTED', 'DISAPPROVED', 'CANCELLED');

-- CreateTable
CREATE TABLE "petty_cash_vouchers" (
    "id" BIGSERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "branch_unit_id" INTEGER,
    "party_id" BIGINT,
    "credit_account_id" BIGINT,
    "responsibility_center_id" BIGINT,
    "voucher_no" VARCHAR(80) NOT NULL,
    "document_date" DATE NOT NULL,
    "party_code_snapshot" VARCHAR(80) NOT NULL,
    "party_name_snapshot" VARCHAR(255) NOT NULL,
    "account_code_snapshot" VARCHAR(80) NOT NULL,
    "account_title_snapshot" VARCHAR(255),
    "responsibility_center_code_snapshot" VARCHAR(80),
    "responsibility_center_snapshot" VARCHAR(150),
    "project_code" VARCHAR(80),
    "project_name" VARCHAR(255),
    "currency_code" VARCHAR(10) NOT NULL DEFAULT 'PHP',
    "exchange_rate" DECIMAL(18,6) NOT NULL DEFAULT 1.00,
    "amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "gross_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "net_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "vat_type" VARCHAR(80),
    "vatable" VARCHAR(20),
    "vat_rate" VARCHAR(80),
    "vat_percent" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "vat_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "ewt_code" VARCHAR(80),
    "ewt_rate" VARCHAR(80),
    "ewt_percent" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "ewt_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "remarks" VARCHAR(500),
    "status" "PettyCashVoucherStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by_user_id" INTEGER,
    "updated_by_user_id" INTEGER,
    "approved_by_user_id" INTEGER,
    "approved_at" TIMESTAMP(3),
    "disapproved_by_user_id" INTEGER,
    "disapproved_at" TIMESTAMP(3),
    "cancelled_by_user_id" INTEGER,
    "cancelled_at" TIMESTAMP(3),
    "posted_by_user_id" INTEGER,
    "posted_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "petty_cash_vouchers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "petty_cash_funds" (
    "id" BIGSERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "branch_unit_id" INTEGER,
    "party_id" BIGINT,
    "credit_account_id" BIGINT,
    "responsibility_center_id" BIGINT,
    "transaction_no" VARCHAR(80) NOT NULL,
    "document_date" DATE NOT NULL,
    "party_code_snapshot" VARCHAR(80) NOT NULL,
    "party_name_snapshot" VARCHAR(255) NOT NULL,
    "responsibility_center_code_snapshot" VARCHAR(80),
    "responsibility_center_snapshot" VARCHAR(150),
    "project_code" VARCHAR(80),
    "project_name" VARCHAR(255),
    "account_code_snapshot" VARCHAR(80) NOT NULL,
    "account_title_snapshot" VARCHAR(255),
    "currency_code" VARCHAR(10) NOT NULL DEFAULT 'PHP',
    "exchange_rate" DECIMAL(18,6) NOT NULL DEFAULT 1.00,
    "amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "remarks" VARCHAR(500),
    "status" "PettyCashFundStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by_user_id" INTEGER,
    "updated_by_user_id" INTEGER,
    "approved_by_user_id" INTEGER,
    "approved_at" TIMESTAMP(3),
    "disapproved_by_user_id" INTEGER,
    "disapproved_at" TIMESTAMP(3),
    "cancelled_by_user_id" INTEGER,
    "cancelled_at" TIMESTAMP(3),
    "posted_by_user_id" INTEGER,
    "posted_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "petty_cash_funds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "petty_cash_fund_details" (
    "id" BIGSERIAL NOT NULL,
    "fund_id" BIGINT NOT NULL,
    "company_id" INTEGER NOT NULL,
    "branch_unit_id" INTEGER,
    "party_id" BIGINT,
    "responsibility_center_id" BIGINT,
    "line_number" INTEGER NOT NULL,
    "date" DATE,
    "supplier_code_snapshot" VARCHAR(80),
    "supplier_name_snapshot" VARCHAR(255),
    "or_no" VARCHAR(80),
    "tin_no" VARCHAR(80),
    "particulars" VARCHAR(500),
    "remarks" VARCHAR(500),
    "amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "net_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "vat_percent" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "vat_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "ewt_code" VARCHAR(80),
    "ewt_percent" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "ewt_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "disburse_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "expense_type" VARCHAR(100),
    "vat_type" VARCHAR(80),
    "gross_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "responsibility_center_code_snapshot" VARCHAR(80),
    "responsibility_center_snapshot" VARCHAR(150),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "petty_cash_fund_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "petty_cash_replenishments" (
    "id" BIGSERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "branch_unit_id" INTEGER,
    "party_id" BIGINT,
    "credit_account_id" BIGINT,
    "responsibility_center_id" BIGINT,
    "transaction_no" VARCHAR(80) NOT NULL,
    "document_date" DATE NOT NULL,
    "party_code_snapshot" VARCHAR(80) NOT NULL,
    "party_name_snapshot" VARCHAR(255) NOT NULL,
    "responsibility_center_code_snapshot" VARCHAR(80),
    "responsibility_center_snapshot" VARCHAR(150),
    "project_code" VARCHAR(80),
    "project_name" VARCHAR(255),
    "account_code_snapshot" VARCHAR(80) NOT NULL,
    "account_title_snapshot" VARCHAR(255),
    "currency_code" VARCHAR(10) NOT NULL DEFAULT 'PHP',
    "exchange_rate" DECIMAL(18,6) NOT NULL DEFAULT 1.00,
    "amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "remarks" VARCHAR(500),
    "status" "PettyCashReplenishmentStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by_user_id" INTEGER,
    "updated_by_user_id" INTEGER,
    "approved_by_user_id" INTEGER,
    "approved_at" TIMESTAMP(3),
    "disapproved_by_user_id" INTEGER,
    "disapproved_at" TIMESTAMP(3),
    "cancelled_by_user_id" INTEGER,
    "cancelled_at" TIMESTAMP(3),
    "posted_by_user_id" INTEGER,
    "posted_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "petty_cash_replenishments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "petty_cash_replenishment_details" (
    "id" BIGSERIAL NOT NULL,
    "replenishment_id" BIGINT NOT NULL,
    "company_id" INTEGER NOT NULL,
    "branch_unit_id" INTEGER,
    "party_id" BIGINT,
    "responsibility_center_id" BIGINT,
    "line_number" INTEGER NOT NULL,
    "petty_cash_date" DATE,
    "petty_cash_no" VARCHAR(80),
    "supplier_code_snapshot" VARCHAR(80),
    "supplier_name_snapshot" VARCHAR(255),
    "particulars" VARCHAR(500),
    "remarks" VARCHAR(500),
    "amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "net_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "vat_type" VARCHAR(80),
    "vat_percent" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "vat_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "ewt_code" VARCHAR(80),
    "ewt_percent" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "ewt_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "disburse_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "responsibility_center_code_snapshot" VARCHAR(80),
    "responsibility_center_snapshot" VARCHAR(150),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "petty_cash_replenishment_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revolving_funds" (
    "id" BIGSERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "branch_unit_id" INTEGER,
    "party_id" BIGINT,
    "credit_account_id" BIGINT,
    "responsibility_center_id" BIGINT,
    "transaction_no" VARCHAR(80) NOT NULL,
    "document_date" DATE NOT NULL,
    "party_code_snapshot" VARCHAR(80) NOT NULL,
    "party_name_snapshot" VARCHAR(255) NOT NULL,
    "responsibility_center_code_snapshot" VARCHAR(80),
    "responsibility_center_snapshot" VARCHAR(150),
    "project_code" VARCHAR(80),
    "project_name" VARCHAR(255),
    "account_code_snapshot" VARCHAR(80) NOT NULL,
    "account_title_snapshot" VARCHAR(255),
    "currency_code" VARCHAR(10) NOT NULL DEFAULT 'PHP',
    "exchange_rate" DECIMAL(18,6) NOT NULL DEFAULT 1.00,
    "amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "remarks" VARCHAR(500),
    "status" "RevolvingFundStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by_user_id" INTEGER,
    "updated_by_user_id" INTEGER,
    "approved_by_user_id" INTEGER,
    "approved_at" TIMESTAMP(3),
    "disapproved_by_user_id" INTEGER,
    "disapproved_at" TIMESTAMP(3),
    "cancelled_by_user_id" INTEGER,
    "cancelled_at" TIMESTAMP(3),
    "posted_by_user_id" INTEGER,
    "posted_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "revolving_funds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revolving_fund_details" (
    "id" BIGSERIAL NOT NULL,
    "fund_id" BIGINT NOT NULL,
    "company_id" INTEGER NOT NULL,
    "branch_unit_id" INTEGER,
    "party_id" BIGINT,
    "responsibility_center_id" BIGINT,
    "line_number" INTEGER NOT NULL,
    "date" DATE,
    "supplier_code_snapshot" VARCHAR(80),
    "supplier_name_snapshot" VARCHAR(255),
    "or_no" VARCHAR(80),
    "tin_no" VARCHAR(80),
    "particulars" VARCHAR(500),
    "remarks" VARCHAR(500),
    "amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "net_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "vat_percent" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "vat_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "ewt_code" VARCHAR(80),
    "ewt_percent" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "ewt_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "disburse_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "expense_type" VARCHAR(100),
    "vat_type" VARCHAR(80),
    "gross_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "responsibility_center_code_snapshot" VARCHAR(80),
    "responsibility_center_snapshot" VARCHAR(150),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "revolving_fund_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revolving_fund_replenishments" (
    "id" BIGSERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "branch_unit_id" INTEGER,
    "party_id" BIGINT,
    "credit_account_id" BIGINT,
    "responsibility_center_id" BIGINT,
    "transaction_no" VARCHAR(80) NOT NULL,
    "document_date" DATE NOT NULL,
    "party_code_snapshot" VARCHAR(80) NOT NULL,
    "party_name_snapshot" VARCHAR(255) NOT NULL,
    "responsibility_center_code_snapshot" VARCHAR(80),
    "responsibility_center_snapshot" VARCHAR(150),
    "project_code" VARCHAR(80),
    "project_name" VARCHAR(255),
    "account_code_snapshot" VARCHAR(80) NOT NULL,
    "account_title_snapshot" VARCHAR(255),
    "currency_code" VARCHAR(10) NOT NULL DEFAULT 'PHP',
    "exchange_rate" DECIMAL(18,6) NOT NULL DEFAULT 1.00,
    "amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "remarks" VARCHAR(500),
    "status" "RevolvingFundReplenishmentStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by_user_id" INTEGER,
    "updated_by_user_id" INTEGER,
    "approved_by_user_id" INTEGER,
    "approved_at" TIMESTAMP(3),
    "disapproved_by_user_id" INTEGER,
    "disapproved_at" TIMESTAMP(3),
    "cancelled_by_user_id" INTEGER,
    "cancelled_at" TIMESTAMP(3),
    "posted_by_user_id" INTEGER,
    "posted_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "revolving_fund_replenishments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revolving_fund_replenishment_details" (
    "id" BIGSERIAL NOT NULL,
    "replenishment_id" BIGINT NOT NULL,
    "company_id" INTEGER NOT NULL,
    "branch_unit_id" INTEGER,
    "party_id" BIGINT,
    "responsibility_center_id" BIGINT,
    "line_number" INTEGER NOT NULL,
    "revolving_fund_date" DATE,
    "revolving_fund_no" VARCHAR(80),
    "supplier_code_snapshot" VARCHAR(80),
    "supplier_name_snapshot" VARCHAR(255),
    "particulars" VARCHAR(500),
    "remarks" VARCHAR(500),
    "amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "net_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "vat_type" VARCHAR(80),
    "vat_percent" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "vat_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "ewt_code" VARCHAR(80),
    "ewt_percent" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "ewt_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "disburse_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "responsibility_center_code_snapshot" VARCHAR(80),
    "responsibility_center_snapshot" VARCHAR(150),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "revolving_fund_replenishment_details_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "petty_cash_vouchers_company_status_idx" ON "petty_cash_vouchers"("company_id", "status");

-- CreateIndex
CREATE INDEX "petty_cash_vouchers_company_document_date_idx" ON "petty_cash_vouchers"("company_id", "document_date");

-- CreateIndex
CREATE INDEX "petty_cash_vouchers_party_id_idx" ON "petty_cash_vouchers"("party_id");

-- CreateIndex
CREATE UNIQUE INDEX "petty_cash_vouchers_company_voucher_no_key" ON "petty_cash_vouchers"("company_id", "voucher_no");

-- CreateIndex
CREATE INDEX "petty_cash_funds_company_status_idx" ON "petty_cash_funds"("company_id", "status");

-- CreateIndex
CREATE INDEX "petty_cash_funds_company_document_date_idx" ON "petty_cash_funds"("company_id", "document_date");

-- CreateIndex
CREATE INDEX "petty_cash_funds_party_id_idx" ON "petty_cash_funds"("party_id");

-- CreateIndex
CREATE UNIQUE INDEX "petty_cash_funds_company_transaction_no_key" ON "petty_cash_funds"("company_id", "transaction_no");

-- CreateIndex
CREATE INDEX "petty_cash_fund_details_company_idx" ON "petty_cash_fund_details"("company_id");

-- CreateIndex
CREATE INDEX "petty_cash_fund_details_party_id_idx" ON "petty_cash_fund_details"("party_id");

-- CreateIndex
CREATE UNIQUE INDEX "petty_cash_fund_details_fund_line_key" ON "petty_cash_fund_details"("fund_id", "line_number");

-- CreateIndex
CREATE INDEX "petty_cash_replenishments_company_status_idx" ON "petty_cash_replenishments"("company_id", "status");

-- CreateIndex
CREATE INDEX "petty_cash_replenishments_company_document_date_idx" ON "petty_cash_replenishments"("company_id", "document_date");

-- CreateIndex
CREATE INDEX "petty_cash_replenishments_party_id_idx" ON "petty_cash_replenishments"("party_id");

-- CreateIndex
CREATE UNIQUE INDEX "petty_cash_replenishments_company_transaction_no_key" ON "petty_cash_replenishments"("company_id", "transaction_no");

-- CreateIndex
CREATE INDEX "petty_cash_replenishment_details_company_idx" ON "petty_cash_replenishment_details"("company_id");

-- CreateIndex
CREATE INDEX "petty_cash_replenishment_details_party_id_idx" ON "petty_cash_replenishment_details"("party_id");

-- CreateIndex
CREATE UNIQUE INDEX "petty_cash_replenishment_details_rep_line_key" ON "petty_cash_replenishment_details"("replenishment_id", "line_number");

-- CreateIndex
CREATE INDEX "revolving_funds_company_status_idx" ON "revolving_funds"("company_id", "status");

-- CreateIndex
CREATE INDEX "revolving_funds_company_document_date_idx" ON "revolving_funds"("company_id", "document_date");

-- CreateIndex
CREATE INDEX "revolving_funds_party_id_idx" ON "revolving_funds"("party_id");

-- CreateIndex
CREATE UNIQUE INDEX "revolving_funds_company_transaction_no_key" ON "revolving_funds"("company_id", "transaction_no");

-- CreateIndex
CREATE INDEX "revolving_fund_details_company_idx" ON "revolving_fund_details"("company_id");

-- CreateIndex
CREATE INDEX "revolving_fund_details_party_id_idx" ON "revolving_fund_details"("party_id");

-- CreateIndex
CREATE UNIQUE INDEX "revolving_fund_details_fund_line_key" ON "revolving_fund_details"("fund_id", "line_number");

-- CreateIndex
CREATE INDEX "revolving_fund_replenishments_company_status_idx" ON "revolving_fund_replenishments"("company_id", "status");

-- CreateIndex
CREATE INDEX "revolving_fund_replenishments_company_document_date_idx" ON "revolving_fund_replenishments"("company_id", "document_date");

-- CreateIndex
CREATE INDEX "revolving_fund_replenishments_party_id_idx" ON "revolving_fund_replenishments"("party_id");

-- CreateIndex
CREATE UNIQUE INDEX "revolving_fund_replenishments_company_transaction_no_key" ON "revolving_fund_replenishments"("company_id", "transaction_no");

-- CreateIndex
CREATE INDEX "revolving_fund_replenishment_details_company_idx" ON "revolving_fund_replenishment_details"("company_id");

-- CreateIndex
CREATE INDEX "revolving_fund_replenishment_details_party_id_idx" ON "revolving_fund_replenishment_details"("party_id");

-- CreateIndex
CREATE UNIQUE INDEX "revolving_fund_replenishment_details_rep_line_key" ON "revolving_fund_replenishment_details"("replenishment_id", "line_number");

-- AddForeignKey
ALTER TABLE "petty_cash_vouchers" ADD CONSTRAINT "petty_cash_vouchers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_vouchers" ADD CONSTRAINT "petty_cash_vouchers_branch_unit_id_fkey" FOREIGN KEY ("branch_unit_id") REFERENCES "company_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_vouchers" ADD CONSTRAINT "petty_cash_vouchers_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_vouchers" ADD CONSTRAINT "petty_cash_vouchers_credit_account_id_fkey" FOREIGN KEY ("credit_account_id") REFERENCES "chart_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_vouchers" ADD CONSTRAINT "petty_cash_vouchers_responsibility_center_id_fkey" FOREIGN KEY ("responsibility_center_id") REFERENCES "responsibility_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_funds" ADD CONSTRAINT "petty_cash_funds_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_funds" ADD CONSTRAINT "petty_cash_funds_branch_unit_id_fkey" FOREIGN KEY ("branch_unit_id") REFERENCES "company_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_funds" ADD CONSTRAINT "petty_cash_funds_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_funds" ADD CONSTRAINT "petty_cash_funds_credit_account_id_fkey" FOREIGN KEY ("credit_account_id") REFERENCES "chart_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_funds" ADD CONSTRAINT "petty_cash_funds_responsibility_center_id_fkey" FOREIGN KEY ("responsibility_center_id") REFERENCES "responsibility_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_fund_details" ADD CONSTRAINT "petty_cash_fund_details_fund_id_fkey" FOREIGN KEY ("fund_id") REFERENCES "petty_cash_funds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_fund_details" ADD CONSTRAINT "petty_cash_fund_details_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_fund_details" ADD CONSTRAINT "petty_cash_fund_details_branch_unit_id_fkey" FOREIGN KEY ("branch_unit_id") REFERENCES "company_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_fund_details" ADD CONSTRAINT "petty_cash_fund_details_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_fund_details" ADD CONSTRAINT "petty_cash_fund_details_responsibility_center_id_fkey" FOREIGN KEY ("responsibility_center_id") REFERENCES "responsibility_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_replenishments" ADD CONSTRAINT "petty_cash_replenishments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_replenishments" ADD CONSTRAINT "petty_cash_replenishments_branch_unit_id_fkey" FOREIGN KEY ("branch_unit_id") REFERENCES "company_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_replenishments" ADD CONSTRAINT "petty_cash_replenishments_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_replenishments" ADD CONSTRAINT "petty_cash_replenishments_credit_account_id_fkey" FOREIGN KEY ("credit_account_id") REFERENCES "chart_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_replenishments" ADD CONSTRAINT "petty_cash_replenishments_responsibility_center_id_fkey" FOREIGN KEY ("responsibility_center_id") REFERENCES "responsibility_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_replenishment_details" ADD CONSTRAINT "petty_cash_replenishment_details_replenishment_id_fkey" FOREIGN KEY ("replenishment_id") REFERENCES "petty_cash_replenishments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_replenishment_details" ADD CONSTRAINT "petty_cash_replenishment_details_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_replenishment_details" ADD CONSTRAINT "petty_cash_replenishment_details_branch_unit_id_fkey" FOREIGN KEY ("branch_unit_id") REFERENCES "company_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_replenishment_details" ADD CONSTRAINT "petty_cash_replenishment_details_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_replenishment_details" ADD CONSTRAINT "petty_cash_replenishment_details_responsibility_center_id_fkey" FOREIGN KEY ("responsibility_center_id") REFERENCES "responsibility_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revolving_funds" ADD CONSTRAINT "revolving_funds_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revolving_funds" ADD CONSTRAINT "revolving_funds_branch_unit_id_fkey" FOREIGN KEY ("branch_unit_id") REFERENCES "company_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revolving_funds" ADD CONSTRAINT "revolving_funds_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revolving_funds" ADD CONSTRAINT "revolving_funds_credit_account_id_fkey" FOREIGN KEY ("credit_account_id") REFERENCES "chart_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revolving_funds" ADD CONSTRAINT "revolving_funds_responsibility_center_id_fkey" FOREIGN KEY ("responsibility_center_id") REFERENCES "responsibility_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revolving_fund_details" ADD CONSTRAINT "revolving_fund_details_fund_id_fkey" FOREIGN KEY ("fund_id") REFERENCES "revolving_funds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revolving_fund_details" ADD CONSTRAINT "revolving_fund_details_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revolving_fund_details" ADD CONSTRAINT "revolving_fund_details_branch_unit_id_fkey" FOREIGN KEY ("branch_unit_id") REFERENCES "company_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revolving_fund_details" ADD CONSTRAINT "revolving_fund_details_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revolving_fund_details" ADD CONSTRAINT "revolving_fund_details_responsibility_center_id_fkey" FOREIGN KEY ("responsibility_center_id") REFERENCES "responsibility_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revolving_fund_replenishments" ADD CONSTRAINT "revolving_fund_replenishments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revolving_fund_replenishments" ADD CONSTRAINT "revolving_fund_replenishments_branch_unit_id_fkey" FOREIGN KEY ("branch_unit_id") REFERENCES "company_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revolving_fund_replenishments" ADD CONSTRAINT "revolving_fund_replenishments_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revolving_fund_replenishments" ADD CONSTRAINT "revolving_fund_replenishments_credit_account_id_fkey" FOREIGN KEY ("credit_account_id") REFERENCES "chart_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revolving_fund_replenishments" ADD CONSTRAINT "revolving_fund_replenishments_responsibility_center_id_fkey" FOREIGN KEY ("responsibility_center_id") REFERENCES "responsibility_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revolving_fund_replenishment_details" ADD CONSTRAINT "revolving_fund_replenishment_details_replenishment_id_fkey" FOREIGN KEY ("replenishment_id") REFERENCES "revolving_fund_replenishments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revolving_fund_replenishment_details" ADD CONSTRAINT "revolving_fund_replenishment_details_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revolving_fund_replenishment_details" ADD CONSTRAINT "revolving_fund_replenishment_details_branch_unit_id_fkey" FOREIGN KEY ("branch_unit_id") REFERENCES "company_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revolving_fund_replenishment_details" ADD CONSTRAINT "revolving_fund_replenishment_details_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revolving_fund_replenishment_details" ADD CONSTRAINT "revolving_fund_replenishment_details_responsibility_center_fkey" FOREIGN KEY ("responsibility_center_id") REFERENCES "responsibility_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
