-- Add project code to Project Maintenance records.
ALTER TABLE "project_maintenance" ADD COLUMN "project_code" VARCHAR(80);

CREATE UNIQUE INDEX "project_maintenance_company_project_code_key" ON "project_maintenance"("company_id", "project_code");
