-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('SALES', 'PURCHASE');

-- CreateEnum
CREATE TYPE "DiscountValueType" AS ENUM ('PERCENTAGE', 'FIXED');

-- CreateEnum
CREATE TYPE "DiscountStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "discounts" (
    "id" BIGSERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "chart_account_id" BIGINT NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" VARCHAR(500),
    "type" "DiscountType" NOT NULL,
    "value_type" "DiscountValueType" NOT NULL,
    "value" DECIMAL(18,4) NOT NULL,
    "status" "DiscountStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_by_user_id" INTEGER,
    "updated_by_user_id" INTEGER,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "discounts_company_name_key" ON "discounts"("company_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "discounts_company_chart_account_key" ON "discounts"("company_id", "chart_account_id");

-- CreateIndex
CREATE INDEX "discounts_chart_account_id_idx" ON "discounts"("chart_account_id");

-- CreateIndex
CREATE INDEX "discounts_company_status_idx" ON "discounts"("company_id", "status");

-- CreateIndex
CREATE INDEX "discounts_company_type_idx" ON "discounts"("company_id", "type");

-- AddForeignKey
ALTER TABLE "discounts" ADD CONSTRAINT "discounts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discounts" ADD CONSTRAINT "discounts_chart_account_id_fkey" FOREIGN KEY ("chart_account_id") REFERENCES "chart_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
