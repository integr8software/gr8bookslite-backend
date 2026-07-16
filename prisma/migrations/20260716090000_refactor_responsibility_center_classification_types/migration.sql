DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'ResponsibilityCenterTrackingBehavior'
  ) THEN
    CREATE TYPE "ResponsibilityCenterTrackingBehavior" AS ENUM (
      'EXPENSES',
      'REVENUE',
      'REVENUE_AND_EXPENSES',
      'REVENUE_EXPENSES_AND_ASSETS'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "responsibility_center_classifications" (
  "id" BIGSERIAL PRIMARY KEY,
  "code" VARCHAR(10) NOT NULL,
  "name" VARCHAR(80) NOT NULL,
  "tracking_behavior" "ResponsibilityCenterTrackingBehavior" NOT NULL,
  "is_system" BOOLEAN NOT NULL DEFAULT true,
  "status" "ResponsibilityCenterStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "responsibility_center_classifications_code_key"
  ON "responsibility_center_classifications"("code");

CREATE UNIQUE INDEX IF NOT EXISTS "responsibility_center_classifications_name_key"
  ON "responsibility_center_classifications"("name");

CREATE INDEX IF NOT EXISTS "responsibility_center_classifications_status_idx"
  ON "responsibility_center_classifications"("status");

INSERT INTO "responsibility_center_classifications"
  ("code", "name", "tracking_behavior", "is_system", "status", "updated_at")
VALUES
  ('CC', 'Cost Center', 'EXPENSES', true, 'ACTIVE', CURRENT_TIMESTAMP),
  ('RC', 'Revenue Center', 'REVENUE', true, 'ACTIVE', CURRENT_TIMESTAMP),
  ('PC', 'Profit Center', 'REVENUE_AND_EXPENSES', true, 'ACTIVE', CURRENT_TIMESTAMP),
  ('IC', 'Investment Center', 'REVENUE_EXPENSES_AND_ASSETS', true, 'ACTIVE', CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "tracking_behavior" = EXCLUDED."tracking_behavior",
  "is_system" = true,
  "status" = 'ACTIVE',
  "updated_at" = CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS "responsibility_center_types" (
  "id" BIGSERIAL PRIMARY KEY,
  "company_id" INTEGER NOT NULL,
  "classification_id" BIGINT NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "code_prefix" VARCHAR(20) NOT NULL,
  "description" VARCHAR(500),
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_required" BOOLEAN NOT NULL DEFAULT false,
  "status" "ResponsibilityCenterStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_by_user_id" INTEGER,
  "updated_by_user_id" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "responsibility_center_types_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "responsibility_center_types_classification_id_fkey"
    FOREIGN KEY ("classification_id") REFERENCES "responsibility_center_classifications"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "responsibility_center_types_company_classification_name_key"
  ON "responsibility_center_types"("company_id", "classification_id", "name");

CREATE UNIQUE INDEX IF NOT EXISTS "responsibility_center_types_company_classification_prefix_key"
  ON "responsibility_center_types"("company_id", "classification_id", "code_prefix");

CREATE INDEX IF NOT EXISTS "responsibility_center_types_company_status_idx"
  ON "responsibility_center_types"("company_id", "status");

CREATE INDEX IF NOT EXISTS "responsibility_center_types_classification_idx"
  ON "responsibility_center_types"("classification_id");

ALTER TABLE "responsibility_centers"
  ADD COLUMN IF NOT EXISTS "type_id" BIGINT;

WITH existing_type_sources AS (
  SELECT DISTINCT
    rc."company_id",
    rc."category",
    rc."financial_type",
    CASE rc."financial_type"
      WHEN 'COST_CENTER' THEN 'CC'
      WHEN 'REVENUE_CENTER' THEN 'RC'
      WHEN 'PROFIT_CENTER' THEN 'PC'
      WHEN 'INVESTMENT_CENTER' THEN 'IC'
    END AS classification_code,
    CASE rc."category"
      WHEN 'CORPORATE' THEN 'Corporate'
      WHEN 'DIVISION' THEN 'Division'
      WHEN 'DEPARTMENT' THEN 'Department'
      WHEN 'SECTION' THEN 'Section'
      WHEN 'TEAM' THEN 'Team'
      WHEN 'BRANCH' THEN 'Branch'
      WHEN 'BUILDING' THEN 'Building'
      WHEN 'PROJECT' THEN 'Project'
      WHEN 'BUSINESS_UNIT' THEN 'Business Unit'
      WHEN 'REGION' THEN 'Region'
      WHEN 'SALESMAN' THEN 'Salesman'
      WHEN 'WAREHOUSE' THEN 'Warehouse'
      WHEN 'OUTLET' THEN 'Outlet'
      WHEN 'SALES_TERRITORY' THEN 'Sales Territory'
      WHEN 'FLEET' THEN 'Fleet'
    END AS type_name,
    CASE rc."category"
      WHEN 'CORPORATE' THEN 'CORP'
      WHEN 'DIVISION' THEN 'DIV'
      WHEN 'DEPARTMENT' THEN 'DEPT'
      WHEN 'SECTION' THEN 'SEC'
      WHEN 'TEAM' THEN 'TEAM'
      WHEN 'BRANCH' THEN 'BR'
      WHEN 'BUILDING' THEN 'BLDG'
      WHEN 'PROJECT' THEN 'PROJ'
      WHEN 'BUSINESS_UNIT' THEN 'BU'
      WHEN 'REGION' THEN 'REG'
      WHEN 'SALESMAN' THEN 'SM'
      WHEN 'WAREHOUSE' THEN 'WHSE'
      WHEN 'OUTLET' THEN 'OUT'
      WHEN 'SALES_TERRITORY' THEN 'ST'
      WHEN 'FLEET' THEN 'FLEET'
    END AS code_prefix
  FROM "responsibility_centers" rc
  WHERE rc."deleted_at" IS NULL
)
INSERT INTO "responsibility_center_types"
  ("company_id", "classification_id", "name", "code_prefix", "description", "sort_order", "is_required", "status", "updated_at")
SELECT
  source."company_id",
  classification."id",
  source."type_name",
  source."code_prefix",
  source."type_name" || ' responsibility center type migrated from existing responsibility centers.',
  100,
  false,
  'ACTIVE',
  CURRENT_TIMESTAMP
FROM existing_type_sources source
JOIN "responsibility_center_classifications" classification
  ON classification."code" = source."classification_code"
WHERE source."type_name" IS NOT NULL
  AND source."code_prefix" IS NOT NULL
ON CONFLICT ("company_id", "classification_id", "name") DO UPDATE SET
  "code_prefix" = EXCLUDED."code_prefix",
  "updated_at" = CURRENT_TIMESTAMP;

UPDATE "responsibility_centers" rc
SET "type_id" = rct."id"
FROM "responsibility_center_classifications" classification
JOIN "responsibility_center_types" rct
  ON rct."classification_id" = classification."id"
WHERE rct."company_id" = rc."company_id"
  AND classification."code" = CASE rc."financial_type"
    WHEN 'COST_CENTER' THEN 'CC'
    WHEN 'REVENUE_CENTER' THEN 'RC'
    WHEN 'PROFIT_CENTER' THEN 'PC'
    WHEN 'INVESTMENT_CENTER' THEN 'IC'
  END
  AND rct."name" = CASE rc."category"
    WHEN 'CORPORATE' THEN 'Corporate'
    WHEN 'DIVISION' THEN 'Division'
    WHEN 'DEPARTMENT' THEN 'Department'
    WHEN 'SECTION' THEN 'Section'
    WHEN 'TEAM' THEN 'Team'
    WHEN 'BRANCH' THEN 'Branch'
    WHEN 'BUILDING' THEN 'Building'
    WHEN 'PROJECT' THEN 'Project'
    WHEN 'BUSINESS_UNIT' THEN 'Business Unit'
    WHEN 'REGION' THEN 'Region'
    WHEN 'SALESMAN' THEN 'Salesman'
    WHEN 'WAREHOUSE' THEN 'Warehouse'
    WHEN 'OUTLET' THEN 'Outlet'
    WHEN 'SALES_TERRITORY' THEN 'Sales Territory'
    WHEN 'FLEET' THEN 'Fleet'
  END
  AND rc."type_id" IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "responsibility_centers" WHERE "type_id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Responsibility Center migration failed: some rows could not be mapped to a type.';
  END IF;
END $$;

ALTER TABLE "responsibility_centers"
  ALTER COLUMN "type_id" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "responsibility_centers_company_type_idx"
  ON "responsibility_centers"("company_id", "type_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'responsibility_centers_type_id_fkey'
  ) THEN
    ALTER TABLE "responsibility_centers"
      ADD CONSTRAINT "responsibility_centers_type_id_fkey"
      FOREIGN KEY ("type_id") REFERENCES "responsibility_center_types"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
