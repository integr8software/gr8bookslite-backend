-- CreateEnum
CREATE TYPE "JournalVoucherStatus" AS ENUM ('DRAFT', 'FOR_APPROVAL', 'POSTED', 'DISAPPROVED', 'CANCELLED');

-- CreateTable
CREATE TABLE "journal_vouchers" (
    "id" BIGSERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "branch_unit_id" INTEGER NOT NULL,
    "transaction_no" VARCHAR(80) NOT NULL,
    "document_date" DATE NOT NULL,
    "remarks" VARCHAR(500),
    "currency_code" VARCHAR(10) NOT NULL,
    "exchange_rate" DECIMAL(18,6) NOT NULL,
    "status" "JournalVoucherStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by_user_id" INTEGER,
    "updated_by_user_id" INTEGER,
    "submitted_by_user_id" INTEGER,
    "submitted_at" TIMESTAMP(3),
    "posted_by_user_id" INTEGER,
    "posted_at" TIMESTAMP(3),
    "disapproved_by_user_id" INTEGER,
    "disapproved_at" TIMESTAMP(3),
    "cancelled_by_user_id" INTEGER,
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journal_vouchers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "journal_vouchers_company_branch_transaction_no_key" ON "journal_vouchers"("company_id", "branch_unit_id", "transaction_no");

-- CreateIndex
CREATE INDEX "journal_vouchers_company_branch_status_idx" ON "journal_vouchers"("company_id", "branch_unit_id", "status");

-- CreateIndex
CREATE INDEX "journal_vouchers_company_document_date_idx" ON "journal_vouchers"("company_id", "document_date");

-- AddForeignKey
ALTER TABLE "journal_vouchers" ADD CONSTRAINT "journal_vouchers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_vouchers" ADD CONSTRAINT "journal_vouchers_branch_unit_id_fkey" FOREIGN KEY ("branch_unit_id") REFERENCES "company_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
