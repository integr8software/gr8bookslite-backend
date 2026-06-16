-- CreateEnum
CREATE TYPE "ChartAccountLevel" AS ENUM ('MAJOR', 'SUB1', 'SUB2', 'SUB3', 'SPECIFIC');

-- CreateEnum
CREATE TYPE "ChartAccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE');

-- CreateEnum
CREATE TYPE "AccountNature" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "ChartAccountStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "chart_accounts" (
    "id" BIGSERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "parent_account_id" BIGINT,
    "account_code" VARCHAR(20) NOT NULL,
    "account_title" VARCHAR(250) NOT NULL,
    "account_level" "ChartAccountLevel" NOT NULL,
    "account_type" "ChartAccountType",
    "account_nature" "AccountNature",
    "account_group" VARCHAR(50),
    "report_alias" VARCHAR(250),
    "class" VARCHAR(50),
    "is_posting_account" BOOLEAN NOT NULL DEFAULT false,
    "with_subsidiary" BOOLEAN NOT NULL DEFAULT false,
    "contra_account" BOOLEAN NOT NULL DEFAULT false,
    "show_total" BOOLEAN NOT NULL DEFAULT false,
    "order_no" INTEGER,
    "status" "ChartAccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "currency_code" VARCHAR(10),
    "who_created" VARCHAR(50),
    "who_modified" VARCHAR(50),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chart_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_accounts" (
    "id" BIGSERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "coa_id" BIGINT NOT NULL,
    "bank_name" VARCHAR(100) NOT NULL,
    "branch" VARCHAR(100),
    "account_number" VARCHAR(100) NOT NULL,
    "account_name" VARCHAR(250) NOT NULL,
    "currency_code" VARCHAR(10),
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "status" "ChartAccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "chart_accounts_company_account_code_key" ON "chart_accounts"("company_id", "account_code");

-- CreateIndex
CREATE INDEX "chart_accounts_parent_account_id_idx" ON "chart_accounts"("parent_account_id");

-- CreateIndex
CREATE INDEX "chart_accounts_status_idx" ON "chart_accounts"("status");

-- CreateIndex
CREATE INDEX "chart_accounts_company_status_idx" ON "chart_accounts"("company_id", "status");

-- CreateIndex
CREATE INDEX "bank_accounts_coa_id_idx" ON "bank_accounts"("coa_id");

-- CreateIndex
CREATE INDEX "bank_accounts_status_idx" ON "bank_accounts"("status");

-- CreateIndex
CREATE INDEX "bank_accounts_company_status_idx" ON "bank_accounts"("company_id", "status");

-- AddForeignKey
ALTER TABLE "chart_accounts" ADD CONSTRAINT "chart_accounts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chart_accounts" ADD CONSTRAINT "chart_accounts_parent_account_id_fkey" FOREIGN KEY ("parent_account_id") REFERENCES "chart_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_coa_id_fkey" FOREIGN KEY ("coa_id") REFERENCES "chart_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
