-- CreateEnum
CREATE TYPE "ProjectMaintenanceStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "project_maintenance" (
    "id" BIGSERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "project_name" VARCHAR(150) NOT NULL,
    "project_description" VARCHAR(500),
    "status" "ProjectMaintenanceStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_by_user_id" INTEGER,
    "updated_by_user_id" INTEGER,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "project_maintenance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "project_maintenance_company_project_name_key" ON "project_maintenance"("company_id", "project_name");

-- CreateIndex
CREATE INDEX "project_maintenance_company_id_idx" ON "project_maintenance"("company_id");

-- CreateIndex
CREATE INDEX "project_maintenance_company_status_idx" ON "project_maintenance"("company_id", "status");

-- AddForeignKey
ALTER TABLE "project_maintenance" ADD CONSTRAINT "project_maintenance_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
