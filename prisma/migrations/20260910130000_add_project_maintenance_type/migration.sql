-- Add the organizational type used by project maintenance.
CREATE TYPE "ProjectMaintenanceType" AS ENUM ('DIVISION', 'DEPARTMENT', 'SECTION', 'UNIT');

ALTER TABLE "project_maintenance"
ADD COLUMN "type" "ProjectMaintenanceType" NOT NULL DEFAULT 'DEPARTMENT';
