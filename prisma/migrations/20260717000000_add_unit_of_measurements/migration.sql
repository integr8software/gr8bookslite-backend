-- CreateEnum
CREATE TYPE "UnitOfMeasurementQuantityMode" AS ENUM ('INTEGER', 'FLOAT');

-- CreateEnum
CREATE TYPE "UnitOfMeasurementStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "unit_of_measurements" (
    "id" BIGSERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "symbol" VARCHAR(30) NOT NULL,
    "quantity_mode" "UnitOfMeasurementQuantityMode" NOT NULL,
    "status" "UnitOfMeasurementStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_by_user_id" INTEGER,
    "updated_by_user_id" INTEGER,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unit_of_measurements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "unit_of_measurements_company_name_key" ON "unit_of_measurements"("company_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "unit_of_measurements_company_symbol_key" ON "unit_of_measurements"("company_id", "symbol");

-- CreateIndex
CREATE INDEX "unit_of_measurements_company_id_idx" ON "unit_of_measurements"("company_id");

-- CreateIndex
CREATE INDEX "unit_of_measurements_company_status_idx" ON "unit_of_measurements"("company_id", "status");

-- CreateIndex
CREATE INDEX "unit_of_measurements_company_quantity_mode_idx" ON "unit_of_measurements"("company_id", "quantity_mode");

-- AddForeignKey
ALTER TABLE "unit_of_measurements" ADD CONSTRAINT "unit_of_measurements_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
