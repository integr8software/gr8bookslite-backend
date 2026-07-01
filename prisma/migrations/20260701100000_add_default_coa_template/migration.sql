-- CreateEnum
CREATE TYPE "DefaultAccountUsageType" AS ENUM ('PARENT', 'POSTING', 'SELECTION_GROUP');

-- CreateTable
CREATE TABLE "default_chart_accounts" (
    "id" BIGSERIAL NOT NULL,
    "parent_default_account_id" BIGINT,
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
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "default_chart_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "default_accounts" (
    "id" BIGSERIAL NOT NULL,
    "module_code" VARCHAR(20) NOT NULL,
    "account_role" VARCHAR(80) NOT NULL,
    "default_chart_account_id" BIGINT NOT NULL,
    "required_level" "ChartAccountLevel" NOT NULL,
    "usage_type" "DefaultAccountUsageType" NOT NULL,
    "description" VARCHAR(250),
    "status" "ChartAccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "default_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_default_accounts" (
    "id" BIGSERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "module_code" VARCHAR(20) NOT NULL,
    "account_role" VARCHAR(80) NOT NULL,
    "chart_account_id" BIGINT NOT NULL,
    "usage_type" "DefaultAccountUsageType" NOT NULL,
    "status" "ChartAccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_default_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "default_chart_accounts_account_code_key" ON "default_chart_accounts"("account_code");

-- CreateIndex
CREATE INDEX "default_chart_accounts_parent_default_account_id_idx" ON "default_chart_accounts"("parent_default_account_id");

-- CreateIndex
CREATE INDEX "default_chart_accounts_status_idx" ON "default_chart_accounts"("status");

-- CreateIndex
CREATE UNIQUE INDEX "default_accounts_module_code_account_role_key" ON "default_accounts"("module_code", "account_role");

-- CreateIndex
CREATE INDEX "default_accounts_default_chart_account_id_idx" ON "default_accounts"("default_chart_account_id");

-- CreateIndex
CREATE INDEX "default_accounts_status_idx" ON "default_accounts"("status");

-- CreateIndex
CREATE UNIQUE INDEX "company_default_accounts_company_module_role_key" ON "company_default_accounts"("company_id", "module_code", "account_role");

-- CreateIndex
CREATE INDEX "company_default_accounts_chart_account_id_idx" ON "company_default_accounts"("chart_account_id");

-- CreateIndex
CREATE INDEX "company_default_accounts_company_status_idx" ON "company_default_accounts"("company_id", "status");

-- AddForeignKey
ALTER TABLE "default_chart_accounts" ADD CONSTRAINT "default_chart_accounts_parent_default_account_id_fkey" FOREIGN KEY ("parent_default_account_id") REFERENCES "default_chart_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "default_accounts" ADD CONSTRAINT "default_accounts_default_chart_account_id_fkey" FOREIGN KEY ("default_chart_account_id") REFERENCES "default_chart_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_default_accounts" ADD CONSTRAINT "company_default_accounts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_default_accounts" ADD CONSTRAINT "company_default_accounts_chart_account_id_fkey" FOREIGN KEY ("chart_account_id") REFERENCES "chart_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
