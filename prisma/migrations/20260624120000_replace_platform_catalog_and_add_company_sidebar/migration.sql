-- Backup checkpoint: take a database snapshot before deploying this migration.
-- Rollback requires restoring that snapshot because the final catalog-table drops are destructive.

CREATE TYPE "SidebarItemType" AS ENUM ('SECTION', 'CONTAINER', 'LINK');

CREATE TABLE "modules" (
  "id" SERIAL NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "default_icon_name" TEXT,
  "route" TEXT,
  "configuration_types" JSONB NOT NULL DEFAULT '[]',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "modules_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "modules_code_key" ON "modules"("code");

INSERT INTO "modules" (
  "id", "code", "name", "route", "configuration_types", "is_active", "created_at", "updated_at"
)
SELECT "id", "code", "name", "route", "configuration_types", "is_active", "created_at", "updated_at"
FROM "platform_submodules";

SELECT setval(
  pg_get_serial_sequence('"modules"', 'id'),
  COALESCE((SELECT MAX("id") FROM "modules"), 1),
  EXISTS (SELECT 1 FROM "modules")
);

-- Broad permissions represented grouping, not a navigable business function. Retire them explicitly.
DELETE FROM "membership_permissions"
WHERE "permission_id" IN (SELECT "id" FROM "permissions" WHERE "submodule_id" IS NULL);
DELETE FROM "company_role_permissions"
WHERE "permission_id" IN (SELECT "id" FROM "permissions" WHERE "submodule_id" IS NULL);
DELETE FROM "permissions" WHERE "submodule_id" IS NULL;

ALTER TABLE "permissions" DROP CONSTRAINT IF EXISTS "permissions_submodule_id_module_id_fkey";
ALTER TABLE "permissions" DROP CONSTRAINT IF EXISTS "permissions_submodule_id_fkey";
ALTER TABLE "permissions" DROP CONSTRAINT IF EXISTS "permissions_target_required_check";
ALTER TABLE "permissions" DROP CONSTRAINT IF EXISTS "permissions_module_id_fkey";
UPDATE "permissions" SET "module_id" = "submodule_id";
ALTER TABLE "permissions" DROP COLUMN "submodule_id";
ALTER TABLE "permissions" DROP COLUMN "target_type";
ALTER TABLE "permissions" ALTER COLUMN "module_id" SET NOT NULL;
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_module_id_fkey"
  FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Expand each old broad company enablement row to all of its leaf modules.
CREATE TEMP TABLE "company_module_expansion" AS
SELECT cm."company_id", ps."id" AS "module_id", cm."is_enabled", cm."enabled_at",
       cm."disabled_at", cm."created_at", cm."updated_at"
FROM "company_modules" cm
JOIN "platform_submodules" ps ON ps."module_id" = cm."module_id";
ALTER TABLE "company_modules" DROP CONSTRAINT IF EXISTS "company_modules_module_id_fkey";
TRUNCATE TABLE "company_modules" RESTART IDENTITY;
INSERT INTO "company_modules" (
  "company_id", "module_id", "is_enabled", "enabled_at", "disabled_at", "created_at", "updated_at"
)
SELECT "company_id", "module_id", bool_or("is_enabled"), max("enabled_at"), max("disabled_at"),
       min("created_at"), max("updated_at")
FROM "company_module_expansion"
GROUP BY "company_id", "module_id";
ALTER TABLE "company_modules" ADD CONSTRAINT "company_modules_module_id_fkey"
  FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Form-signatory setups are expanded to each former leaf and their rows are copied.
CREATE TEMP TABLE "signatory_expansion" AS
SELECT fs."id" AS "old_setup_id", fs."company_id", fs."unit_id", ps."id" AS "module_id",
       fs."created_at", fs."updated_at"
FROM "form_signatory_setups" fs
JOIN "platform_submodules" ps ON ps."module_id" = fs."module_id";
CREATE TEMP TABLE "signatory_rows_backup" AS SELECT * FROM "form_signatory_rows";
ALTER TABLE "form_signatory_setups" DROP CONSTRAINT IF EXISTS "form_signatory_setups_module_id_fkey";
TRUNCATE TABLE "form_signatory_setups" RESTART IDENTITY CASCADE;
INSERT INTO "form_signatory_setups" ("company_id", "unit_id", "module_id", "created_at", "updated_at")
SELECT DISTINCT "company_id", "unit_id", "module_id", "created_at", "updated_at" FROM "signatory_expansion";
INSERT INTO "form_signatory_rows" (
  "setup_id", "label", "name", "position", "signature_name", "signature_image",
  "signature_valid_until", "is_this_temporary", "created_at", "updated_at"
)
SELECT target."id", row."label", row."name", row."position", row."signature_name", row."signature_image",
       row."signature_valid_until", row."is_this_temporary", row."created_at", row."updated_at"
FROM "signatory_expansion" expansion
JOIN "form_signatory_setups" target
  ON target."company_id" = expansion."company_id"
 AND target."unit_id" = expansion."unit_id"
 AND target."module_id" = expansion."module_id"
JOIN "signatory_rows_backup" row ON row."setup_id" = expansion."old_setup_id";
ALTER TABLE "form_signatory_setups" ADD CONSTRAINT "form_signatory_setups_module_id_fkey"
  FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "transaction_number_sequences" DROP CONSTRAINT IF EXISTS "transaction_number_sequences_platform_submodule_id_fkey";
ALTER TABLE "transaction_number_sequences" RENAME COLUMN "platform_submodule_id" TO "module_id";
ALTER INDEX IF EXISTS "transaction_number_sequences_platform_submodule_id_branch_unit_id_key"
  RENAME TO "transaction_number_sequences_module_id_branch_unit_id_key";
ALTER INDEX IF EXISTS "transaction_number_sequences_platform_submodule_id_idx"
  RENAME TO "transaction_number_sequences_module_id_idx";
ALTER TABLE "transaction_number_sequences" ADD CONSTRAINT "transaction_number_sequences_module_id_fkey"
  FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Plan rows already use stable leaf codes; replace strings with direct module foreign keys.
ALTER TABLE "subscription_plan_modules" ADD COLUMN "module_id" INTEGER;
DELETE FROM "subscription_plan_modules" duplicate
WHERE duplicate."module_key" = 'maintenance-item-management-items'
  AND EXISTS (
    SELECT 1 FROM "subscription_plan_modules" canonical
    WHERE canonical."subscription_plan_id" = duplicate."subscription_plan_id"
      AND canonical."module_key" = 'maintenance-items'
  );
UPDATE "subscription_plan_modules" SET "module_key" = CASE "module_key"
  WHEN 'dashboard-overview' THEN 'DO'
  WHEN 'maintenance-financial-management-charts-of-accounts' THEN 'COA'
  WHEN 'cash-receipt-official-receipt' THEN 'OR'
  WHEN 'cash-disbursement-disbursement-voucher' THEN 'DV'
  WHEN 'accounts-payable-accounts-payable-voucher' THEN 'APV'
  WHEN 'general-journal-journal-voucher' THEN 'JV'
  WHEN 'sales-service-invoice' THEN 'SVI'
  WHEN 'maintenance-items' THEN 'I'
  WHEN 'maintenance-item-management-items' THEN 'I'
  WHEN 'maintenance-warehouse-management' THEN 'WM'
  WHEN 'inventory-inventory-account' THEN 'IA'
  WHEN 'inventory-receiving-report' THEN 'RR'
  WHEN 'inventory-material-request' THEN 'MR'
  WHEN 'inventory-pick-list' THEN 'PL'
  WHEN 'purchasing-purchase-request' THEN 'PR'
  WHEN 'purchasing-purchase-order' THEN 'PO'
  ELSE "module_key" END;
DELETE FROM "subscription_plan_modules" a USING "subscription_plan_modules" b
WHERE a."id" > b."id" AND a."subscription_plan_id" = b."subscription_plan_id" AND a."module_key" = b."module_key";
UPDATE "subscription_plan_modules" spm
SET "module_id" = module."id"
FROM "modules" module
WHERE module."code" = spm."module_key";
DELETE FROM "subscription_plan_modules" WHERE "module_id" IS NULL;
ALTER TABLE "subscription_plan_modules" ALTER COLUMN "module_id" SET NOT NULL;
CREATE UNIQUE INDEX "subscription_plan_modules_subscription_plan_id_module_id_key"
  ON "subscription_plan_modules"("subscription_plan_id", "module_id");
CREATE INDEX "subscription_plan_modules_module_id_is_enabled_idx"
  ON "subscription_plan_modules"("module_id", "is_enabled");
ALTER TABLE "subscription_plan_modules" ADD CONSTRAINT "subscription_plan_modules_module_id_fkey"
  FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "company_sidebar_items" (
  "id" SERIAL NOT NULL,
  "company_id" INTEGER NOT NULL,
  "parent_id" INTEGER,
  "module_id" INTEGER,
  "item_type" "SidebarItemType" NOT NULL,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "icon_name" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_visible" BOOLEAN NOT NULL DEFAULT true,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "company_sidebar_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "company_sidebar_items_shape_check" CHECK (
    ("item_type" = 'LINK' AND "module_id" IS NOT NULL) OR
    ("item_type" <> 'LINK' AND "module_id" IS NULL)
  )
);
CREATE UNIQUE INDEX "company_sidebar_items_company_id_key_key" ON "company_sidebar_items"("company_id", "key");
CREATE UNIQUE INDEX "company_sidebar_items_company_id_module_id_key" ON "company_sidebar_items"("company_id", "module_id");
CREATE INDEX "company_sidebar_items_company_id_parent_id_sort_order_idx" ON "company_sidebar_items"("company_id", "parent_id", "sort_order");
ALTER TABLE "company_sidebar_items" ADD CONSTRAINT "company_sidebar_items_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "company_sidebar_items" ADD CONSTRAINT "company_sidebar_items_parent_id_fkey"
  FOREIGN KEY ("parent_id") REFERENCES "company_sidebar_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "company_sidebar_items" ADD CONSTRAINT "company_sidebar_items_module_id_fkey"
  FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- A short-lived legacy Prisma relation used this camel-cased column; it has no runtime consumer.
ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "platformModuleId";

DROP TABLE "platform_submodules";
DROP TABLE "platform_modules";
DROP TYPE "PermissionTargetType";
