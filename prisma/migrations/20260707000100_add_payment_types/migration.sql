-- CreateEnum
CREATE TYPE "PaymentTypeClassification" AS ENUM ('CASH', 'WITH_BANK', 'BANK_TRANSFER', 'ONLINE_PAYMENT', 'MULTIPLE_CHECK', 'DEBIT');

-- CreateEnum
CREATE TYPE "PaymentTypeStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "payment_types" (
    "id" BIGSERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" VARCHAR(500),
    "classification" "PaymentTypeClassification" NOT NULL,
    "status" "PaymentTypeStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_by_user_id" INTEGER,
    "updated_by_user_id" INTEGER,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_types_company_name_key" ON "payment_types"("company_id", "name");

-- CreateIndex
CREATE INDEX "payment_types_company_id_idx" ON "payment_types"("company_id");

-- CreateIndex
CREATE INDEX "payment_types_company_status_idx" ON "payment_types"("company_id", "status");

-- CreateIndex
CREATE INDEX "payment_types_company_classification_idx" ON "payment_types"("company_id", "classification");

-- AddForeignKey
ALTER TABLE "payment_types" ADD CONSTRAINT "payment_types_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
