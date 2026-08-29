-- CreateEnum
CREATE TYPE "AdvanceToSupplierStatus" AS ENUM ('DRAFT', 'FOR_APPROVAL', 'APPROVED', 'DISAPPROVED', 'POSTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AdvanceToSupplierPaymentType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');

-- CreateTable
CREATE TABLE "advances_to_suppliers" (
    "id" BIGSERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "branch_unit_id" INTEGER,
    "party_id" BIGINT,
    "credit_account_id" BIGINT,
    "trans_no" VARCHAR(80) NOT NULL,
    "document_date" DATE NOT NULL,
    "party_code_snapshot" VARCHAR(80) NOT NULL,
    "party_name_snapshot" VARCHAR(255) NOT NULL,
    "account_code_snapshot" VARCHAR(80) NOT NULL,
    "account_title_snapshot" VARCHAR(255),
    "responsibility_center_snapshot" VARCHAR(255),
    "responsibility_center_code_snapshot" VARCHAR(80),
    "project_name_snapshot" VARCHAR(255),
    "project_code_snapshot" VARCHAR(80),
    "currency_code" VARCHAR(10) NOT NULL DEFAULT 'PHP',
    "exchange_rate" DECIMAL(18,6) NOT NULL DEFAULT 1.00,
    "po_reference" VARCHAR(120) NOT NULL,
    "total_po_amount" DECIMAL(18,2) NOT NULL,
    "advance_payment_type" "AdvanceToSupplierPaymentType" NOT NULL DEFAULT 'PERCENTAGE',
    "advance_payment_percentage" DECIMAL(9,4) NOT NULL DEFAULT 0.00,
    "amount" DECIMAL(18,2) NOT NULL,
    "remarks" VARCHAR(500),
    "status" "AdvanceToSupplierStatus" NOT NULL DEFAULT 'DRAFT',
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

    CONSTRAINT "advances_to_suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "advances_to_suppliers_company_trans_no_key" ON "advances_to_suppliers"("company_id", "trans_no");

-- CreateIndex
CREATE INDEX "advances_to_suppliers_company_status_idx" ON "advances_to_suppliers"("company_id", "status");

-- CreateIndex
CREATE INDEX "advances_to_suppliers_company_document_date_idx" ON "advances_to_suppliers"("company_id", "document_date");

-- CreateIndex
CREATE INDEX "advances_to_suppliers_party_id_idx" ON "advances_to_suppliers"("party_id");

-- AddForeignKey
ALTER TABLE "advances_to_suppliers" ADD CONSTRAINT "advances_to_suppliers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advances_to_suppliers" ADD CONSTRAINT "advances_to_suppliers_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advances_to_suppliers" ADD CONSTRAINT "advances_to_suppliers_credit_account_id_fkey" FOREIGN KEY ("credit_account_id") REFERENCES "chart_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
