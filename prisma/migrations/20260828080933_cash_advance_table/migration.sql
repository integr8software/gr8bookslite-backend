-- CreateEnum
CREATE TYPE "CashAdvanceStatus" AS ENUM ('DRAFT', 'FOR_APPROVAL', 'APPROVED', 'DISAPPROVED', 'POSTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "cash_advances" (
    "id" BIGSERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "branch_unit_id" INTEGER,
    "party_id" BIGINT,
    "credit_account_id" BIGINT,
    "term_id" BIGINT,
    "trans_no" VARCHAR(80) NOT NULL,
    "document_date" DATE NOT NULL,
    "due_date" DATE,
    "reference_no" VARCHAR(120),
    "party_code_snapshot" VARCHAR(80) NOT NULL,
    "party_name_snapshot" VARCHAR(255) NOT NULL,
    "address_snapshot" VARCHAR(500),
    "contact_person_snapshot" VARCHAR(255),
    "contact_no_snapshot" VARCHAR(40),
    "account_code_snapshot" VARCHAR(80) NOT NULL,
    "account_title_snapshot" VARCHAR(255),
    "cost_center_snapshot" VARCHAR(255),
    "cost_center_code_snapshot" VARCHAR(80),
    "project_ref_snapshot" VARCHAR(255),
    "project_code_snapshot" VARCHAR(80),
    "currency_code" VARCHAR(10) NOT NULL DEFAULT 'PHP',
    "exchange_rate" DECIMAL(18,6) NOT NULL DEFAULT 1.00,
    "amount" DECIMAL(18,2) NOT NULL,
    "remarks" VARCHAR(500),
    "status" "CashAdvanceStatus" NOT NULL DEFAULT 'DRAFT',
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

    CONSTRAINT "cash_advances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cash_advances_company_status_idx" ON "cash_advances"("company_id", "status");

-- CreateIndex
CREATE INDEX "cash_advances_company_document_date_idx" ON "cash_advances"("company_id", "document_date");

-- CreateIndex
CREATE INDEX "cash_advances_party_id_idx" ON "cash_advances"("party_id");

-- CreateIndex
CREATE UNIQUE INDEX "cash_advances_company_trans_no_key" ON "cash_advances"("company_id", "trans_no");

-- AddForeignKey
ALTER TABLE "cash_advances" ADD CONSTRAINT "cash_advances_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_advances" ADD CONSTRAINT "cash_advances_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_advances" ADD CONSTRAINT "cash_advances_credit_account_id_fkey" FOREIGN KEY ("credit_account_id") REFERENCES "chart_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
