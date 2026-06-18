-- CreateTable
CREATE TABLE "psgc_barangays" (
    "id" SERIAL NOT NULL,
    "barangay_code" VARCHAR(20) NOT NULL,
    "name" TEXT NOT NULL,
    "region_code" VARCHAR(20) NOT NULL,
    "province_code" VARCHAR(20) NOT NULL,
    "city_municipality_code" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "psgc_barangays_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "psgc_barangays_barangay_code_key" ON "psgc_barangays"("barangay_code");

-- CreateIndex
CREATE INDEX "psgc_barangays_region_code_idx" ON "psgc_barangays"("region_code");

-- CreateIndex
CREATE INDEX "psgc_barangays_province_code_idx" ON "psgc_barangays"("province_code");

-- CreateIndex
CREATE INDEX "psgc_barangays_city_municipality_code_idx" ON "psgc_barangays"("city_municipality_code");

-- CreateIndex
CREATE INDEX "psgc_barangays_name_idx" ON "psgc_barangays"("name");
