-- CreateEnum
CREATE TYPE "BillingStatementStatus" AS ENUM ('DRAFT', 'FOR_APPROVAL', 'DISAPPROVED', 'POSTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "billing_statements" (
    "id" BIGSERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "branch_unit_id" INTEGER NOT NULL,
    "party_id" BIGINT,
    "term_id" BIGINT,
    "receivable_account_id" BIGINT,
    "transaction_no" VARCHAR(80) NOT NULL,
    "document_date" DATE NOT NULL,
    "due_date" DATE NOT NULL,
    "invoice_no" VARCHAR(120),
    "reference_no" VARCHAR(120),
    "party_code_snapshot" VARCHAR(80) NOT NULL,
    "party_name_snapshot" VARCHAR(255) NOT NULL,
    "bill_to_name_snapshot" VARCHAR(255),
    "address_snapshot" VARCHAR(500),
    "contact_person_snapshot" VARCHAR(255),
    "contact_no_snapshot" VARCHAR(40),
    "business_style" VARCHAR(120),
    "project_code" VARCHAR(80),
    "project_name" VARCHAR(255),
    "project_ref" VARCHAR(120),
    "sales_associate" VARCHAR(150),
    "team_assigned" VARCHAR(150),
    "currency_code" VARCHAR(10) NOT NULL,
    "exchange_rate" DECIMAL(18,6) NOT NULL,
    "net_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "vat_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "wvat_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "ewt_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "gross_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "remarks" VARCHAR(500),
    "status" "BillingStatementStatus" NOT NULL DEFAULT 'DRAFT',
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

    CONSTRAINT "billing_statements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_statement_details" (
    "id" BIGSERIAL NOT NULL,
    "billing_statement_id" BIGINT NOT NULL,
    "company_id" INTEGER NOT NULL,
    "branch_unit_id" INTEGER NOT NULL,
    "line_number" INTEGER NOT NULL,
    "description" VARCHAR(250) NOT NULL,
    "particulars" VARCHAR(500),
    "quantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "net_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "vat_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "wvat_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "ewt_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "discount_percent" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "gross_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "vat_type" VARCHAR(80),
    "vatable" BOOLEAN NOT NULL DEFAULT false,
    "vat_inclusive" BOOLEAN NOT NULL DEFAULT false,
    "with_wvat" BOOLEAN NOT NULL DEFAULT false,
    "wvat_type" VARCHAR(80),
    "with_ewt" BOOLEAN NOT NULL DEFAULT false,
    "ewt_type" VARCHAR(80),
    "responsibility_center_id" BIGINT,
    "responsibility_center_snapshot" VARCHAR(150),

    CONSTRAINT "billing_statement_details_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "billing_statements_company_branch_status_idx" ON "billing_statements"("company_id", "branch_unit_id", "status");

-- CreateIndex
CREATE INDEX "billing_statements_company_document_date_idx" ON "billing_statements"("company_id", "document_date");

-- CreateIndex
CREATE INDEX "billing_statements_party_id_idx" ON "billing_statements"("party_id");

-- CreateIndex
CREATE INDEX "billing_statements_receivable_account_id_idx" ON "billing_statements"("receivable_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "billing_statements_company_branch_transaction_no_key" ON "billing_statements"("company_id", "branch_unit_id", "transaction_no");

-- CreateIndex
CREATE INDEX "billing_statement_details_company_branch_idx" ON "billing_statement_details"("company_id", "branch_unit_id");

-- CreateIndex
CREATE INDEX "billing_statement_details_rc_idx" ON "billing_statement_details"("responsibility_center_id");

-- CreateIndex
CREATE UNIQUE INDEX "billing_statement_details_billing_statement_line_key" ON "billing_statement_details"("billing_statement_id", "line_number");

-- AddForeignKey
ALTER TABLE "billing_statements" ADD CONSTRAINT "billing_statements_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_statements" ADD CONSTRAINT "billing_statements_branch_unit_id_fkey" FOREIGN KEY ("branch_unit_id") REFERENCES "company_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_statements" ADD CONSTRAINT "billing_statements_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_statements" ADD CONSTRAINT "billing_statements_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_statements" ADD CONSTRAINT "billing_statements_receivable_account_id_fkey" FOREIGN KEY ("receivable_account_id") REFERENCES "chart_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_statement_details" ADD CONSTRAINT "billing_statement_details_billing_statement_id_fkey" FOREIGN KEY ("billing_statement_id") REFERENCES "billing_statements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_statement_details" ADD CONSTRAINT "billing_statement_details_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_statement_details" ADD CONSTRAINT "billing_statement_details_branch_unit_id_fkey" FOREIGN KEY ("branch_unit_id") REFERENCES "company_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_statement_details" ADD CONSTRAINT "billing_statement_details_responsibility_center_id_fkey" FOREIGN KEY ("responsibility_center_id") REFERENCES "responsibility_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
