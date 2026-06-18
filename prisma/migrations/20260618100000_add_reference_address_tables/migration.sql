-- Rename the earlier PSGC-only table to the direct reference table name.
DO $$
BEGIN
  IF to_regclass('public.psgc_barangays') IS NOT NULL
     AND to_regclass('public.barangays') IS NULL THEN
    ALTER TABLE "psgc_barangays" RENAME TO "barangays";
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "regions" (
    "id" SERIAL NOT NULL,
    "psgc_code" VARCHAR(20) NOT NULL,
    "region_code" VARCHAR(20) NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "regions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "provinces" (
    "id" SERIAL NOT NULL,
    "psgc_code" VARCHAR(20) NOT NULL,
    "province_code" VARCHAR(20) NOT NULL,
    "name" TEXT NOT NULL,
    "region_code" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provinces_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "city_municipalities" (
    "id" SERIAL NOT NULL,
    "psgc_code" VARCHAR(20) NOT NULL,
    "city_municipality_code" VARCHAR(20) NOT NULL,
    "name" TEXT NOT NULL,
    "region_code" VARCHAR(20) NOT NULL,
    "province_code" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "city_municipalities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "barangays" (
    "id" SERIAL NOT NULL,
    "psgc_code" VARCHAR(20) NOT NULL,
    "barangay_code" VARCHAR(20) NOT NULL,
    "name" TEXT NOT NULL,
    "region_code" VARCHAR(20) NOT NULL,
    "province_code" VARCHAR(20) NOT NULL,
    "city_municipality_code" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "barangays_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "barangays"
  ADD COLUMN IF NOT EXISTS "psgc_code" VARCHAR(20);

UPDATE "barangays"
SET "psgc_code" = "barangay_code"
WHERE "psgc_code" IS NULL;

ALTER TABLE "barangays"
  ALTER COLUMN "psgc_code" SET NOT NULL,
  ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS "regions_psgc_code_key" ON "regions"("psgc_code");
CREATE UNIQUE INDEX IF NOT EXISTS "regions_region_code_key" ON "regions"("region_code");
CREATE INDEX IF NOT EXISTS "regions_name_idx" ON "regions"("name");

CREATE UNIQUE INDEX IF NOT EXISTS "provinces_psgc_code_key" ON "provinces"("psgc_code");
CREATE UNIQUE INDEX IF NOT EXISTS "provinces_province_code_key" ON "provinces"("province_code");
CREATE INDEX IF NOT EXISTS "provinces_region_code_idx" ON "provinces"("region_code");
CREATE INDEX IF NOT EXISTS "provinces_name_idx" ON "provinces"("name");

CREATE UNIQUE INDEX IF NOT EXISTS "city_municipalities_psgc_code_key" ON "city_municipalities"("psgc_code");
CREATE UNIQUE INDEX IF NOT EXISTS "city_municipalities_city_municipality_code_key" ON "city_municipalities"("city_municipality_code");
CREATE INDEX IF NOT EXISTS "city_municipalities_region_code_idx" ON "city_municipalities"("region_code");
CREATE INDEX IF NOT EXISTS "city_municipalities_province_code_idx" ON "city_municipalities"("province_code");
CREATE INDEX IF NOT EXISTS "city_municipalities_name_idx" ON "city_municipalities"("name");

CREATE UNIQUE INDEX IF NOT EXISTS "barangays_psgc_code_key" ON "barangays"("psgc_code");
CREATE UNIQUE INDEX IF NOT EXISTS "barangays_barangay_code_key" ON "barangays"("barangay_code");
CREATE INDEX IF NOT EXISTS "barangays_region_code_idx" ON "barangays"("region_code");
CREATE INDEX IF NOT EXISTS "barangays_province_code_idx" ON "barangays"("province_code");
CREATE INDEX IF NOT EXISTS "barangays_city_municipality_code_idx" ON "barangays"("city_municipality_code");
CREATE INDEX IF NOT EXISTS "barangays_name_idx" ON "barangays"("name");

ALTER TABLE "provinces"
  ADD CONSTRAINT "provinces_region_code_fkey"
  FOREIGN KEY ("region_code") REFERENCES "regions"("region_code")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "city_municipalities"
  ADD CONSTRAINT "city_municipalities_region_code_fkey"
  FOREIGN KEY ("region_code") REFERENCES "regions"("region_code")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "city_municipalities"
  ADD CONSTRAINT "city_municipalities_province_code_fkey"
  FOREIGN KEY ("province_code") REFERENCES "provinces"("province_code")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "barangays"
  ADD CONSTRAINT "barangays_region_code_fkey"
  FOREIGN KEY ("region_code") REFERENCES "regions"("region_code")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "barangays"
  ADD CONSTRAINT "barangays_province_code_fkey"
  FOREIGN KEY ("province_code") REFERENCES "provinces"("province_code")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "barangays"
  ADD CONSTRAINT "barangays_city_municipality_code_fkey"
  FOREIGN KEY ("city_municipality_code") REFERENCES "city_municipalities"("city_municipality_code")
  ON DELETE RESTRICT ON UPDATE CASCADE;

DROP VIEW IF EXISTS "address_autocomplete_view";
CREATE VIEW "address_autocomplete_view" AS
SELECT
  b."barangay_code",
  b."name" AS "barangay_name",
  cm."city_municipality_code",
  cm."name" AS "city_municipality_name",
  p."province_code",
  p."name" AS "province_name",
  r."region_code",
  r."name" AS "region_name",
  CONCAT_WS(', ', b."name", cm."name", p."name", r."name") AS "label",
  LOWER(CONCAT_WS(' ', b."name", cm."name", p."name", r."name", b."barangay_code", cm."city_municipality_code", p."province_code", r."region_code")) AS "search_text"
FROM "barangays" b
JOIN "city_municipalities" cm
  ON cm."city_municipality_code" = b."city_municipality_code"
JOIN "provinces" p
  ON p."province_code" = b."province_code"
JOIN "regions" r
  ON r."region_code" = b."region_code";
