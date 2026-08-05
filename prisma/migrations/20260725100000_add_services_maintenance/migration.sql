-- CreateEnum
CREATE TYPE "ServiceAccountSetupMode" AS ENUM ('AUTO', 'EXISTING');

-- CreateTable
CREATE TABLE "services_maintenance" (
    "id" BIGSERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "revenue_coa_id" BIGINT NOT NULL,
    "service_name" VARCHAR(150) NOT NULL,
    "description" VARCHAR(500),
    "account_setup_mode" "ServiceAccountSetupMode" NOT NULL DEFAULT 'AUTO',
    "is_generated_revenue_account" BOOLEAN NOT NULL DEFAULT true,
    "status" "ChartAccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_by_user_id" INTEGER,
    "updated_by_user_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "services_maintenance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "services_maintenance_company_service_name_unique" ON "services_maintenance"("company_id", "service_name");

-- CreateIndex
CREATE INDEX "services_maintenance_company_id_idx" ON "services_maintenance"("company_id");

-- CreateIndex
CREATE INDEX "services_maintenance_company_status_idx" ON "services_maintenance"("company_id", "status");

-- CreateIndex
CREATE INDEX "services_maintenance_revenue_coa_id_idx" ON "services_maintenance"("revenue_coa_id");

-- AddForeignKey
ALTER TABLE "services_maintenance" ADD CONSTRAINT "services_maintenance_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services_maintenance" ADD CONSTRAINT "services_maintenance_revenue_coa_id_fkey" FOREIGN KEY ("revenue_coa_id") REFERENCES "chart_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
