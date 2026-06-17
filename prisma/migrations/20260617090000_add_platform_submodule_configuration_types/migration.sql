ALTER TABLE "platform_submodules"
  ADD COLUMN IF NOT EXISTS "configuration_types" JSONB NOT NULL DEFAULT '[]'::jsonb;

WITH "new_submodules" (
  "module_code",
  "code",
  "name",
  "route",
  "sort_order",
  "configuration_types"
) AS (
  VALUES
    (
      'maintenance',
      'IB',
      'Item Bundle',
      '/maintenance/item-management/item-bundle',
      35,
      '["Registry"]'::jsonb
    ),
    (
      'cash-disbursement',
      'RF',
      'Revolving Fund',
      '/cash-disbursement/revolving-fund',
      85,
      '["Transaction", "Registry"]'::jsonb
    )
)
INSERT INTO "platform_submodules" (
  "module_id",
  "code",
  "name",
  "route",
  "sort_order",
  "configuration_types",
  "is_active",
  "updated_at"
)
SELECT
  "module"."id",
  "new_submodules"."code",
  "new_submodules"."name",
  "new_submodules"."route",
  "new_submodules"."sort_order",
  "new_submodules"."configuration_types",
  true,
  CURRENT_TIMESTAMP
FROM "new_submodules"
JOIN "platform_modules" AS "module"
  ON "module"."code" = "new_submodules"."module_code"
ON CONFLICT ("code") DO UPDATE
SET
  "module_id" = EXCLUDED."module_id",
  "name" = EXCLUDED."name",
  "route" = EXCLUDED."route",
  "sort_order" = EXCLUDED."sort_order",
  "configuration_types" = EXCLUDED."configuration_types",
  "is_active" = true,
  "updated_at" = CURRENT_TIMESTAMP;

INSERT INTO "permissions" (
  "target_type",
  "module_id",
  "submodule_id",
  "code",
  "name",
  "scope_level",
  "requires_company_context",
  "is_active",
  "updated_at"
)
SELECT
  'SUBMODULE'::"PermissionTargetType",
  "submodule"."module_id",
  "submodule"."id",
  "submodule"."code",
  "submodule"."name",
  'BRANCH'::"AccessScopeLevel",
  true,
  true,
  CURRENT_TIMESTAMP
FROM "platform_submodules" AS "submodule"
WHERE "submodule"."code" IN ('IB', 'RF')
ON CONFLICT ("code") DO UPDATE
SET
  "target_type" = EXCLUDED."target_type",
  "module_id" = EXCLUDED."module_id",
  "submodule_id" = EXCLUDED."submodule_id",
  "name" = EXCLUDED."name",
  "scope_level" = EXCLUDED."scope_level",
  "requires_company_context" = EXCLUDED."requires_company_context",
  "is_active" = true,
  "updated_at" = CURRENT_TIMESTAMP;

WITH "configuration_catalog" ("name", "configuration_types") AS (
  VALUES
    ('Party Management', '["Registry"]'::jsonb),
    ('Items', '["Registry"]'::jsonb),
    ('Item Bundle', '["Registry"]'::jsonb),
    ('Official Receipt', '["Transaction", "Registry"]'::jsonb),
    ('Collection Receipt', '["Transaction", "Registry"]'::jsonb),
    ('Acknowledgement Receipt', '["Transaction", "Registry"]'::jsonb),
    ('Provisional Receipt', '["Transaction", "Registry"]'::jsonb),
    ('Bank Reconciliation', '["Transaction", "Registry"]'::jsonb),
    (
      'Product Distribution Center Warehouse',
      '["Transaction", "Registry"]'::jsonb
    ),
    ('Disbursement Voucher', '["Transaction", "Registry"]'::jsonb),
    ('Cash Advance', '["Transaction", "Registry"]'::jsonb),
    ('Cash Advance Multiple Entry', '["Transaction", "Registry"]'::jsonb),
    ('Petty Cash Voucher', '["Transaction", "Registry"]'::jsonb),
    ('Petty Cash Fund', '["Transaction", "Registry"]'::jsonb),
    ('Petty Cash Fund Replenishment', '["Transaction", "Registry"]'::jsonb),
    ('Petty Cash Advance', '["Transaction", "Registry"]'::jsonb),
    (
      'Petty Cash Advance Replenishment',
      '["Transaction", "Registry"]'::jsonb
    ),
    ('Revolving Fund', '["Transaction", "Registry"]'::jsonb),
    ('Request For Payment', '["Transaction", "Registry"]'::jsonb),
    ('Advances To Supplier', '["Transaction", "Registry"]'::jsonb),
    ('Accounts Payable Voucher', '["Transaction", "Registry"]'::jsonb),
    ('Journal Voucher', '["Transaction", "Registry"]'::jsonb),
    ('Debit Memo', '["Transaction", "Registry"]'::jsonb),
    ('Credit Memo', '["Transaction", "Registry"]'::jsonb),
    ('Sales Quotation', '["Transaction", "Registry"]'::jsonb),
    ('Sales Order', '["Transaction", "Registry"]'::jsonb),
    ('Sales Invoice', '["Transaction", "Registry"]'::jsonb),
    ('Billing', '["Transaction", "Registry"]'::jsonb),
    ('Billing Statement', '["Transaction", "Registry"]'::jsonb),
    ('Billing Invoice', '["Transaction", "Registry"]'::jsonb),
    ('Service Invoice', '["Transaction", "Registry"]'::jsonb),
    ('Cash Sales Invoice', '["Transaction", "Registry"]'::jsonb),
    ('Sales Journal', '["Transaction", "Registry"]'::jsonb),
    ('Statement of Account', '["Transaction", "Registry"]'::jsonb),
    ('Receiving Report', '["Transaction", "Registry"]'::jsonb),
    ('Goods Receipt', '["Transaction", "Registry"]'::jsonb),
    ('Material Request', '["Transaction", "Registry"]'::jsonb),
    ('Pick List', '["Transaction", "Registry"]'::jsonb),
    ('Goods Issue', '["Transaction", "Registry"]'::jsonb),
    ('Delivery Receipt', '["Transaction", "Registry"]'::jsonb),
    ('Purchase Request', '["Transaction", "Registry"]'::jsonb),
    ('Purchase Order', '["Transaction", "Registry"]'::jsonb),
    ('Purchase Journal', '["Transaction", "Registry"]'::jsonb),
    ('Canvass Form', '["Transaction", "Registry"]'::jsonb),
    ('Fixed Asset', '["Transaction", "Registry"]'::jsonb)
)
UPDATE "platform_submodules" AS "submodule"
SET
  "configuration_types" = "configuration_catalog"."configuration_types",
  "updated_at" = CURRENT_TIMESTAMP
FROM "configuration_catalog"
WHERE "configuration_catalog"."name" = "submodule"."name";
