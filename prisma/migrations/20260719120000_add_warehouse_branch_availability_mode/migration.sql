-- CreateEnum
CREATE TYPE "WarehouseBranchAvailabilityMode" AS ENUM ('ALL', 'SPECIFIC', 'EXCEPT');

-- AlterTable
ALTER TABLE "warehouses" ADD COLUMN "branch_availability_mode" "WarehouseBranchAvailabilityMode" NOT NULL DEFAULT 'SPECIFIC';

-- Preserve existing limited warehouses as SPECIFIC, but upgrade warehouses that
-- already cover every active company unit so future units are included too.
UPDATE "warehouses" AS "warehouse"
SET "branch_availability_mode" = 'ALL'
WHERE "warehouse"."deleted_at" IS NULL
  AND EXISTS (
    SELECT 1
    FROM "company_units" AS "unit"
    WHERE "unit"."company_id" = "warehouse"."company_id"
      AND "unit"."is_active" = true
  )
  AND NOT EXISTS (
    SELECT 1
    FROM "company_units" AS "unit"
    WHERE "unit"."company_id" = "warehouse"."company_id"
      AND "unit"."is_active" = true
      AND NOT EXISTS (
        SELECT 1
        FROM "warehouse_branches" AS "branch"
        WHERE "branch"."warehouse_id" = "warehouse"."id"
          AND "branch"."unit_id" = "unit"."id"
      )
  );
