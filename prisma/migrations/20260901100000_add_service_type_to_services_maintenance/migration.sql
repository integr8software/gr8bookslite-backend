-- CreateEnum
CREATE TYPE "ServiceMaintenanceType" AS ENUM ('PURCHASES', 'SALES');

-- AlterTable
ALTER TABLE "services_maintenance"
ADD COLUMN "service_type" "ServiceMaintenanceType" NOT NULL DEFAULT 'SALES';
