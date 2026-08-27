-- Add acknowledgement receipt and provisional receipt

-- CreateEnum
CREATE TYPE "AcknowledgementReceiptStatus" AS ENUM ('DRAFT', 'FOR_APPROVAL', 'DISAPPROVED', 'POSTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "acknowledgement_receipts" (
    "id" BIGSERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "branch_unit_id" INTEGER NOT NULL,
    "party_id" BIGINT,
    "term_id" BIGINT,
    "receivable_account_id" BIGINT,
    "transaction_no" VARCHAR(80) NOT NULL,
    "document_date" DATE NOT NULL,
    "due_date" DATE NOT NULL,
    "receipt_no" VARCHAR(120),
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
    "status" "AcknowledgementReceiptStatus" NOT NULL DEFAULT 'DRAFT',
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

    CONSTRAINT "acknowledgement_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acknowledgement_receipt_details" (
    "id" BIGSERIAL NOT NULL,
    "acknowledgement_receipt_id" BIGINT NOT NULL,
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

    CONSTRAINT "acknowledgement_receipt_details_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "acknowledgement_receipts_company_branch_transaction_no_key" ON "acknowledgement_receipts"("company_id", "branch_unit_id", "transaction_no");
CREATE INDEX "acknowledgement_receipts_company_branch_status_idx" ON "acknowledgement_receipts"("company_id", "branch_unit_id", "status");
CREATE INDEX "acknowledgement_receipts_company_document_date_idx" ON "acknowledgement_receipts"("company_id", "document_date");
CREATE INDEX "acknowledgement_receipts_party_id_idx" ON "acknowledgement_receipts"("party_id");
CREATE INDEX "acknowledgement_receipts_receivable_account_id_idx" ON "acknowledgement_receipts"("receivable_account_id");
CREATE UNIQUE INDEX "acknowledgement_receipt_details_receipt_line_key" ON "acknowledgement_receipt_details"("acknowledgement_receipt_id", "line_number");
CREATE INDEX "acknowledgement_receipt_details_company_branch_idx" ON "acknowledgement_receipt_details"("company_id", "branch_unit_id");
CREATE INDEX "acknowledgement_receipt_details_rc_idx" ON "acknowledgement_receipt_details"("responsibility_center_id");

-- AddForeignKey
ALTER TABLE "acknowledgement_receipts" ADD CONSTRAINT "acknowledgement_receipts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "acknowledgement_receipts" ADD CONSTRAINT "acknowledgement_receipts_branch_unit_id_fkey" FOREIGN KEY ("branch_unit_id") REFERENCES "company_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "acknowledgement_receipts" ADD CONSTRAINT "acknowledgement_receipts_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "acknowledgement_receipts" ADD CONSTRAINT "acknowledgement_receipts_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "acknowledgement_receipts" ADD CONSTRAINT "acknowledgement_receipts_receivable_account_id_fkey" FOREIGN KEY ("receivable_account_id") REFERENCES "chart_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "acknowledgement_receipt_details" ADD CONSTRAINT "acknowledgement_receipt_details_acknowledgement_receipt_id_fkey" FOREIGN KEY ("acknowledgement_receipt_id") REFERENCES "acknowledgement_receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "acknowledgement_receipt_details" ADD CONSTRAINT "acknowledgement_receipt_details_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "acknowledgement_receipt_details" ADD CONSTRAINT "acknowledgement_receipt_details_branch_unit_id_fkey" FOREIGN KEY ("branch_unit_id") REFERENCES "company_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "acknowledgement_receipt_details" ADD CONSTRAINT "acknowledgement_receipt_details_responsibility_center_id_fkey" FOREIGN KEY ("responsibility_center_id") REFERENCES "responsibility_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- CreateEnum
CREATE TYPE "ProvisionalReceiptStatus" AS ENUM ('DRAFT', 'FOR_APPROVAL', 'DISAPPROVED', 'POSTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "provisional_receipts" (
    "id" BIGSERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "branch_unit_id" INTEGER NOT NULL,
    "party_id" BIGINT,
    "term_id" BIGINT,
    "receivable_account_id" BIGINT,
    "transaction_no" VARCHAR(80) NOT NULL,
    "document_date" DATE NOT NULL,
    "due_date" DATE NOT NULL,
    "receipt_no" VARCHAR(120),
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
    "status" "ProvisionalReceiptStatus" NOT NULL DEFAULT 'DRAFT',
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

    CONSTRAINT "provisional_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provisional_receipt_details" (
    "id" BIGSERIAL NOT NULL,
    "provisional_receipt_id" BIGINT NOT NULL,
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

    CONSTRAINT "provisional_receipt_details_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "provisional_receipts_company_branch_transaction_no_key" ON "provisional_receipts"("company_id", "branch_unit_id", "transaction_no");
CREATE INDEX "provisional_receipts_company_branch_status_idx" ON "provisional_receipts"("company_id", "branch_unit_id", "status");
CREATE INDEX "provisional_receipts_company_document_date_idx" ON "provisional_receipts"("company_id", "document_date");
CREATE INDEX "provisional_receipts_party_id_idx" ON "provisional_receipts"("party_id");
CREATE INDEX "provisional_receipts_receivable_account_id_idx" ON "provisional_receipts"("receivable_account_id");
CREATE UNIQUE INDEX "provisional_receipt_details_receipt_line_key" ON "provisional_receipt_details"("provisional_receipt_id", "line_number");
CREATE INDEX "provisional_receipt_details_company_branch_idx" ON "provisional_receipt_details"("company_id", "branch_unit_id");
CREATE INDEX "provisional_receipt_details_rc_idx" ON "provisional_receipt_details"("responsibility_center_id");

-- AddForeignKey
ALTER TABLE "provisional_receipts" ADD CONSTRAINT "provisional_receipts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "provisional_receipts" ADD CONSTRAINT "provisional_receipts_branch_unit_id_fkey" FOREIGN KEY ("branch_unit_id") REFERENCES "company_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "provisional_receipts" ADD CONSTRAINT "provisional_receipts_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "provisional_receipts" ADD CONSTRAINT "provisional_receipts_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "provisional_receipts" ADD CONSTRAINT "provisional_receipts_receivable_account_id_fkey" FOREIGN KEY ("receivable_account_id") REFERENCES "chart_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "provisional_receipt_details" ADD CONSTRAINT "provisional_receipt_details_provisional_receipt_id_fkey" FOREIGN KEY ("provisional_receipt_id") REFERENCES "provisional_receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "provisional_receipt_details" ADD CONSTRAINT "provisional_receipt_details_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "provisional_receipt_details" ADD CONSTRAINT "provisional_receipt_details_branch_unit_id_fkey" FOREIGN KEY ("branch_unit_id") REFERENCES "company_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "provisional_receipt_details" ADD CONSTRAINT "provisional_receipt_details_responsibility_center_id_fkey" FOREIGN KEY ("responsibility_center_id") REFERENCES "responsibility_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
