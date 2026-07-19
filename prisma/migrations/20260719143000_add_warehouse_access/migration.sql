CREATE TYPE "WarehouseAccessLevel" AS ENUM ('VIEWER', 'PICKER', 'MANAGER');

CREATE TYPE "WarehouseAccessPermission" AS ENUM (
  'VIEW_STOCK',
  'RECEIVE_STOCK',
  'ISSUE_STOCK',
  'TRANSFER_STOCK',
  'ADJUST_STOCK',
  'MANAGE_LOCATIONS',
  'VIEW_HISTORY'
);

CREATE TYPE "WarehouseAccessStatus" AS ENUM ('ACTIVE', 'INACTIVE');

CREATE TABLE "warehouse_access" (
  "id" BIGSERIAL NOT NULL,
  "company_id" INTEGER NOT NULL,
  "warehouse_id" BIGINT NOT NULL,
  "user_id" INTEGER NOT NULL,
  "access_level" "WarehouseAccessLevel" NOT NULL DEFAULT 'VIEWER',
  "permissions" "WarehouseAccessPermission"[] NOT NULL,
  "status" "WarehouseAccessStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_by_user_id" INTEGER,
  "updated_by_user_id" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "warehouse_access_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "warehouse_access_company_warehouse_user_key" ON "warehouse_access"("company_id", "warehouse_id", "user_id");
CREATE INDEX "warehouse_access_company_warehouse_idx" ON "warehouse_access"("company_id", "warehouse_id");
CREATE INDEX "warehouse_access_company_user_idx" ON "warehouse_access"("company_id", "user_id");
CREATE INDEX "warehouse_access_company_status_idx" ON "warehouse_access"("company_id", "status");

ALTER TABLE "warehouse_access" ADD CONSTRAINT "warehouse_access_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "warehouse_access" ADD CONSTRAINT "warehouse_access_warehouse_id_fkey"
  FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "warehouse_access" ADD CONSTRAINT "warehouse_access_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
