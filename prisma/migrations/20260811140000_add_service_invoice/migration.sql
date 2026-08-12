-- CreateEnum
CREATE TYPE "ServiceInvoiceStatus" AS ENUM ('DRAFT', 'FOR_APPROVAL', 'DISAPPROVED', 'POSTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "service_invoices" (
    "id" BIGSERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "branch_unit_id" INTEGER NOT NULL,
    "party_id" BIGINT,
    "term_id" BIGINT,
    "receivable_account_id" BIGINT NOT NULL,
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
    "status" "ServiceInvoiceStatus" NOT NULL DEFAULT 'DRAFT',
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

    CONSTRAINT "service_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_invoice_details" (
    "id" BIGSERIAL NOT NULL,
    "service_invoice_id" BIGINT NOT NULL,
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

    CONSTRAINT "service_invoice_details_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "service_invoices_company_branch_transaction_no_key" ON "service_invoices"("company_id", "branch_unit_id", "transaction_no");

-- CreateIndex
CREATE INDEX "service_invoices_company_branch_status_idx" ON "service_invoices"("company_id", "branch_unit_id", "status");

-- CreateIndex
CREATE INDEX "service_invoices_company_document_date_idx" ON "service_invoices"("company_id", "document_date");

-- CreateIndex
CREATE INDEX "service_invoices_party_id_idx" ON "service_invoices"("party_id");

-- CreateIndex
CREATE INDEX "service_invoices_receivable_account_id_idx" ON "service_invoices"("receivable_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "service_invoice_details_invoice_line_key" ON "service_invoice_details"("service_invoice_id", "line_number");

-- CreateIndex
CREATE INDEX "service_invoice_details_company_branch_idx" ON "service_invoice_details"("company_id", "branch_unit_id");

-- CreateIndex
CREATE INDEX "service_invoice_details_rc_idx" ON "service_invoice_details"("responsibility_center_id");

-- AddForeignKey
ALTER TABLE "service_invoices" ADD CONSTRAINT "service_invoices_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_invoices" ADD CONSTRAINT "service_invoices_branch_unit_id_fkey" FOREIGN KEY ("branch_unit_id") REFERENCES "company_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_invoices" ADD CONSTRAINT "service_invoices_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_invoices" ADD CONSTRAINT "service_invoices_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_invoices" ADD CONSTRAINT "service_invoices_receivable_account_id_fkey" FOREIGN KEY ("receivable_account_id") REFERENCES "chart_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_invoice_details" ADD CONSTRAINT "service_invoice_details_service_invoice_id_fkey" FOREIGN KEY ("service_invoice_id") REFERENCES "service_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_invoice_details" ADD CONSTRAINT "service_invoice_details_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_invoice_details" ADD CONSTRAINT "service_invoice_details_branch_unit_id_fkey" FOREIGN KEY ("branch_unit_id") REFERENCES "company_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_invoice_details" ADD CONSTRAINT "service_invoice_details_responsibility_center_id_fkey" FOREIGN KEY ("responsibility_center_id") REFERENCES "responsibility_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
