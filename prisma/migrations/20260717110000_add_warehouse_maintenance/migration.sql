-- CreateEnum
CREATE TYPE "WarehouseStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "warehouses" (
    "id" BIGSERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "code" VARCHAR(80) NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "manager_name" VARCHAR(180),
    "status" "WarehouseStatus" NOT NULL DEFAULT 'ACTIVE',
    "address" VARCHAR(500),
    "contact_no" VARCHAR(40),
    "description" VARCHAR(500),
    "created_by_user_id" INTEGER,
    "updated_by_user_id" INTEGER,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouse_branches" (
    "id" BIGSERIAL NOT NULL,
    "warehouse_id" BIGINT NOT NULL,
    "unit_id" INTEGER NOT NULL,

    CONSTRAINT "warehouse_branches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "warehouses_company_code_key" ON "warehouses"("company_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "warehouses_company_name_key" ON "warehouses"("company_id", "name");

-- CreateIndex
CREATE INDEX "warehouses_company_id_idx" ON "warehouses"("company_id");

-- CreateIndex
CREATE INDEX "warehouses_company_status_idx" ON "warehouses"("company_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "warehouse_branches_warehouse_unit_key" ON "warehouse_branches"("warehouse_id", "unit_id");

-- CreateIndex
CREATE INDEX "warehouse_branches_unit_id_idx" ON "warehouse_branches"("unit_id");

-- AddForeignKey
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_branches" ADD CONSTRAINT "warehouse_branches_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_branches" ADD CONSTRAINT "warehouse_branches_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "company_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
