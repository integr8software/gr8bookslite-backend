-- CreateEnum
CREATE TYPE "ResponsibilityCenterCategory" AS ENUM ('CORPORATE', 'DIVISION', 'DEPARTMENT', 'SECTION', 'TEAM', 'BRANCH', 'BUILDING', 'PROJECT', 'BUSINESS_UNIT', 'REGION', 'SALESMAN', 'WAREHOUSE', 'OUTLET', 'SALES_TERRITORY', 'FLEET');

-- CreateEnum
CREATE TYPE "ResponsibilityCenterFinancialType" AS ENUM ('COST_CENTER', 'PROFIT_CENTER', 'REVENUE_CENTER', 'INVESTMENT_CENTER');

-- CreateEnum
CREATE TYPE "ResponsibilityCenterStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "responsibility_centers" (
    "id" BIGSERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "category" "ResponsibilityCenterCategory" NOT NULL,
    "financial_type" "ResponsibilityCenterFinancialType" NOT NULL,
    "manager" VARCHAR(150),
    "parent_id" BIGINT,
    "status" "ResponsibilityCenterStatus" NOT NULL DEFAULT 'ACTIVE',
    "description" VARCHAR(500),
    "created_by_user_id" INTEGER,
    "updated_by_user_id" INTEGER,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "responsibility_centers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "responsibility_centers_company_code_key" ON "responsibility_centers"("company_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "responsibility_centers_company_name_key" ON "responsibility_centers"("company_id", "name");

-- CreateIndex
CREATE INDEX "responsibility_centers_company_status_idx" ON "responsibility_centers"("company_id", "status");

-- CreateIndex
CREATE INDEX "responsibility_centers_company_category_idx" ON "responsibility_centers"("company_id", "category");

-- CreateIndex
CREATE INDEX "responsibility_centers_company_financial_type_idx" ON "responsibility_centers"("company_id", "financial_type");

-- CreateIndex
CREATE INDEX "responsibility_centers_company_parent_idx" ON "responsibility_centers"("company_id", "parent_id");

-- AddForeignKey
ALTER TABLE "responsibility_centers" ADD CONSTRAINT "responsibility_centers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responsibility_centers" ADD CONSTRAINT "responsibility_centers_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "responsibility_centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
