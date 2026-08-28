-- CreateEnum
CREATE TYPE "CashVoucherStatus" AS ENUM ('DRAFT', 'FOR_APPROVAL', 'APPROVED', 'POSTED', 'DISAPPROVED', 'CANCELLED', 'CLOSED');

-- CreateTable
CREATE TABLE "cash_vouchers" (
    "id" BIGSERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "branch_unit_id" INTEGER,
    "party_id" BIGINT,
    "credit_account_id" BIGINT,
    "voucher_no" VARCHAR(80) NOT NULL,
    "voucher_date" DATE NOT NULL,
    "payment_due_date" DATE,
    "reference_no" VARCHAR(120),
    "reference_module" VARCHAR(80),
    "voucher_reference_no" VARCHAR(120),
    "invoice_reference_no" VARCHAR(120),
    "payment_method" VARCHAR(50) NOT NULL DEFAULT 'Cash',
    "disbursement_type" VARCHAR(100),
    "party_code_snapshot" VARCHAR(80) NOT NULL,
    "party_name_snapshot" VARCHAR(255) NOT NULL,
    "cost_center" VARCHAR(80),
    "project_name" VARCHAR(255),
    "prepared_by" VARCHAR(255),
    "currency_code" VARCHAR(10) NOT NULL DEFAULT 'PHP',
    "exchange_rate" DECIMAL(18,6) NOT NULL DEFAULT 1.00,
    "amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "remarks" VARCHAR(500),
    "status" "CashVoucherStatus" NOT NULL DEFAULT 'DRAFT',
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

    CONSTRAINT "cash_vouchers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_voucher_details" (
    "id" BIGSERIAL NOT NULL,
    "voucher_id" BIGINT NOT NULL,
    "company_id" INTEGER NOT NULL,
    "branch_unit_id" INTEGER,
    "party_id" BIGINT,
    "line_number" INTEGER NOT NULL,
    "account_id" BIGINT,
    "account_code_snapshot" VARCHAR(80) NOT NULL,
    "account_title_snapshot" VARCHAR(255) NOT NULL,
    "particulars" VARCHAR(500),
    "remarks" VARCHAR(500),
    "debit" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "gross_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "net_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "vat_type" VARCHAR(80),
    "vat_code" VARCHAR(80),
    "vat_percent" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "vat_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "ewt_code" VARCHAR(80),
    "ewt_percent" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "ewt_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "disburse_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "party_code_snapshot" VARCHAR(80),
    "party_name_snapshot" VARCHAR(255),
    "responsibility_center_id" BIGINT,
    "responsibility_center_snapshot" VARCHAR(150),
    "ref_id" VARCHAR(120),
    "check_date" DATE,
    "check_no" VARCHAR(80),
    "check_status" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_voucher_details_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cash_vouchers_company_status_idx" ON "cash_vouchers"("company_id", "status");

-- CreateIndex
CREATE INDEX "cash_vouchers_company_voucher_date_idx" ON "cash_vouchers"("company_id", "voucher_date");

-- CreateIndex
CREATE INDEX "cash_vouchers_party_id_idx" ON "cash_vouchers"("party_id");

-- CreateIndex
CREATE UNIQUE INDEX "cash_vouchers_company_voucher_no_key" ON "cash_vouchers"("company_id", "voucher_no");

-- CreateIndex
CREATE INDEX "cash_voucher_details_company_idx" ON "cash_voucher_details"("company_id");

-- CreateIndex
CREATE INDEX "cash_voucher_details_party_id_idx" ON "cash_voucher_details"("party_id");

-- CreateIndex
CREATE INDEX "cash_voucher_details_account_id_idx" ON "cash_voucher_details"("account_id");

-- CreateIndex
CREATE UNIQUE INDEX "cash_voucher_details_voucher_line_key" ON "cash_voucher_details"("voucher_id", "line_number");

-- AddForeignKey
ALTER TABLE "cash_vouchers" ADD CONSTRAINT "cash_vouchers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_vouchers" ADD CONSTRAINT "cash_vouchers_branch_unit_id_fkey" FOREIGN KEY ("branch_unit_id") REFERENCES "company_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_vouchers" ADD CONSTRAINT "cash_vouchers_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_vouchers" ADD CONSTRAINT "cash_vouchers_credit_account_id_fkey" FOREIGN KEY ("credit_account_id") REFERENCES "chart_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_voucher_details" ADD CONSTRAINT "cash_voucher_details_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "cash_vouchers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_voucher_details" ADD CONSTRAINT "cash_voucher_details_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_voucher_details" ADD CONSTRAINT "cash_voucher_details_branch_unit_id_fkey" FOREIGN KEY ("branch_unit_id") REFERENCES "company_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_voucher_details" ADD CONSTRAINT "cash_voucher_details_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_voucher_details" ADD CONSTRAINT "cash_voucher_details_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "chart_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_voucher_details" ADD CONSTRAINT "cash_voucher_details_responsibility_center_id_fkey" FOREIGN KEY ("responsibility_center_id") REFERENCES "responsibility_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
