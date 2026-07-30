CREATE TYPE "AccountsPayableVoucherStatus" AS ENUM ('DRAFT', 'APPROVED', 'DISAPPROVED', 'CLOSED', 'CANCELLED');

CREATE TYPE "AccountsPayableVoucherPayableType" AS ENUM ('TRADE_PAYABLE', 'NON_TRADE_PAYABLE', 'EMPLOYEE_PAYABLE', 'TAX_PAYABLE', 'ACCRUED_PAYABLE');

CREATE TABLE "accounts_payable_vouchers" (
  "id" BIGSERIAL NOT NULL,
  "company_id" INTEGER NOT NULL,
  "branch_unit_id" INTEGER NOT NULL,
  "party_id" BIGINT,
  "term_id" BIGINT,
  "credit_account_id" BIGINT NOT NULL,
  "transaction_no" VARCHAR(80) NOT NULL,
  "document_date" DATE NOT NULL,
  "due_date" DATE NOT NULL,
  "reference_no" VARCHAR(120),
  "party_code_snapshot" VARCHAR(80) NOT NULL,
  "party_name_snapshot" VARCHAR(255) NOT NULL,
  "address_snapshot" VARCHAR(500),
  "contact_person_snapshot" VARCHAR(255),
  "contact_no_snapshot" VARCHAR(40),
  "project_name" VARCHAR(255),
  "currency_code" VARCHAR(10) NOT NULL,
  "exchange_rate" DECIMAL(18,6) NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "payable_type" "AccountsPayableVoucherPayableType" NOT NULL,
  "remarks" VARCHAR(500),
  "status" "AccountsPayableVoucherStatus" NOT NULL DEFAULT 'DRAFT',
  "created_by_user_id" INTEGER,
  "updated_by_user_id" INTEGER,
  "approved_by_user_id" INTEGER,
  "approved_at" TIMESTAMP(3),
  "disapproved_by_user_id" INTEGER,
  "disapproved_at" TIMESTAMP(3),
  "cancelled_by_user_id" INTEGER,
  "cancelled_at" TIMESTAMP(3),
  "closed_by_user_id" INTEGER,
  "closed_at" TIMESTAMP(3),
  "deleted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "accounts_payable_vouchers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "accounts_payable_voucher_details" (
  "id" BIGSERIAL NOT NULL,
  "voucher_id" BIGINT NOT NULL,
  "company_id" INTEGER NOT NULL,
  "branch_unit_id" INTEGER NOT NULL,
  "party_id" BIGINT,
  "line_number" INTEGER NOT NULL,
  "expense_account_id" BIGINT NOT NULL,
  "expense_account_code_snapshot" VARCHAR(20) NOT NULL,
  "expense_type_snapshot" VARCHAR(250) NOT NULL,
  "currency_code" VARCHAR(10) NOT NULL,
  "exchange_rate" DECIMAL(18,6) NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "net_amount" DECIMAL(18,2) NOT NULL,
  "vat" VARCHAR(80),
  "vat_percent" DECIMAL(8,4) NOT NULL DEFAULT 0,
  "vat_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "ewt" VARCHAR(80),
  "ewt_percent" DECIMAL(8,4) NOT NULL DEFAULT 0,
  "ewt_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "total_amount_due" DECIMAL(18,2) NOT NULL,
  "party_code_snapshot" VARCHAR(80),
  "party_name_snapshot" VARCHAR(255),
  "particulars" VARCHAR(500),
  "responsibility_center_id" BIGINT,
  "responsibility_center_snapshot" VARCHAR(150),
  "reference_no" VARCHAR(120),

  CONSTRAINT "accounts_payable_voucher_details_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "journal_entries" (
  "id" BIGSERIAL NOT NULL,
  "company_id" INTEGER NOT NULL,
  "branch_unit_id" INTEGER NOT NULL,
  "reference_type" VARCHAR(20) NOT NULL,
  "reference_id" BIGINT NOT NULL,
  "reference_no_snapshot" VARCHAR(120),
  "line_number" INTEGER NOT NULL,
  "account_id" BIGINT NOT NULL,
  "account_code_snapshot" VARCHAR(20) NOT NULL,
  "account_title_snapshot" VARCHAR(250) NOT NULL,
  "currency_code" VARCHAR(10) NOT NULL,
  "exchange_rate" DECIMAL(18,6) NOT NULL,
  "particulars" VARCHAR(500),
  "debit" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "credit" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "vat_type" VARCHAR(80),
  "atc_code" VARCHAR(80),
  "party_code_snapshot" VARCHAR(80),
  "party_name_snapshot" VARCHAR(255),
  "responsibility_center_id" BIGINT,
  "responsibility_center_snapshot" VARCHAR(150),
  "ref_no" VARCHAR(120),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ap_vouchers_company_branch_transaction_no_key" ON "accounts_payable_vouchers"("company_id", "branch_unit_id", "transaction_no");
CREATE INDEX "ap_vouchers_company_branch_status_idx" ON "accounts_payable_vouchers"("company_id", "branch_unit_id", "status");
CREATE INDEX "ap_vouchers_company_document_date_idx" ON "accounts_payable_vouchers"("company_id", "document_date");
CREATE INDEX "ap_vouchers_party_id_idx" ON "accounts_payable_vouchers"("party_id");
CREATE INDEX "ap_vouchers_credit_account_id_idx" ON "accounts_payable_vouchers"("credit_account_id");

CREATE UNIQUE INDEX "ap_voucher_details_voucher_line_key" ON "accounts_payable_voucher_details"("voucher_id", "line_number");
CREATE INDEX "ap_voucher_details_company_branch_idx" ON "accounts_payable_voucher_details"("company_id", "branch_unit_id");
CREATE INDEX "ap_voucher_details_party_id_idx" ON "accounts_payable_voucher_details"("party_id");
CREATE INDEX "ap_voucher_details_expense_account_idx" ON "accounts_payable_voucher_details"("expense_account_id");
CREATE INDEX "ap_voucher_details_rc_idx" ON "accounts_payable_voucher_details"("responsibility_center_id");

CREATE UNIQUE INDEX "journal_entries_reference_line_key" ON "journal_entries"("company_id", "branch_unit_id", "reference_type", "reference_id", "line_number");
CREATE INDEX "journal_entries_reference_idx" ON "journal_entries"("company_id", "branch_unit_id", "reference_type", "reference_id");
CREATE INDEX "journal_entries_reference_type_idx" ON "journal_entries"("company_id", "branch_unit_id", "reference_type");
CREATE INDEX "journal_entries_account_idx" ON "journal_entries"("account_id");
CREATE INDEX "journal_entries_rc_idx" ON "journal_entries"("responsibility_center_id");

ALTER TABLE "accounts_payable_vouchers"
  ADD CONSTRAINT "accounts_payable_vouchers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "accounts_payable_vouchers_branch_unit_id_fkey" FOREIGN KEY ("branch_unit_id") REFERENCES "company_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "accounts_payable_vouchers_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "accounts_payable_vouchers_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "terms"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "accounts_payable_vouchers_credit_account_id_fkey" FOREIGN KEY ("credit_account_id") REFERENCES "chart_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "accounts_payable_voucher_details"
  ADD CONSTRAINT "accounts_payable_voucher_details_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "accounts_payable_vouchers"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "accounts_payable_voucher_details_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "accounts_payable_voucher_details_branch_unit_id_fkey" FOREIGN KEY ("branch_unit_id") REFERENCES "company_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "accounts_payable_voucher_details_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "accounts_payable_voucher_details_expense_account_id_fkey" FOREIGN KEY ("expense_account_id") REFERENCES "chart_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "accounts_payable_voucher_details_responsibility_center_id_fkey" FOREIGN KEY ("responsibility_center_id") REFERENCES "responsibility_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "journal_entries"
  ADD CONSTRAINT "journal_entries_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "journal_entries_branch_unit_id_fkey" FOREIGN KEY ("branch_unit_id") REFERENCES "company_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "journal_entries_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "chart_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "journal_entries_responsibility_center_id_fkey" FOREIGN KEY ("responsibility_center_id") REFERENCES "responsibility_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
