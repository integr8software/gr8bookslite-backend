-- Scope custom branch roles to the company unit they were created for.
ALTER TABLE "company_roles" ADD COLUMN "unit_id" INTEGER;

-- If an existing branch role is already assigned in exactly one unit, keep it
-- available in that unit after the new scope is applied.
WITH "single_unit_role_access" AS (
  SELECT
    "company_role_id",
    MIN("unit_id") AS "unit_id",
    COUNT(DISTINCT "unit_id") AS "unit_count"
  FROM "membership_unit_access"
  WHERE "company_role_id" IS NOT NULL
  GROUP BY "company_role_id"
)
UPDATE "company_roles" AS "role"
SET "unit_id" = "access"."unit_id"
FROM "single_unit_role_access" AS "access"
WHERE "role"."id" = "access"."company_role_id"
  AND "role"."scope_level" = 'BRANCH'
  AND "access"."unit_count" = 1;

DROP INDEX "company_roles_company_id_code_key";

CREATE UNIQUE INDEX "company_roles_company_id_unit_id_code_key"
  ON "company_roles"("company_id", "unit_id", "code");

CREATE INDEX "company_roles_unit_id_idx" ON "company_roles"("unit_id");

ALTER TABLE "company_roles"
  ADD CONSTRAINT "company_roles_unit_id_fkey"
  FOREIGN KEY ("unit_id") REFERENCES "company_units"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
