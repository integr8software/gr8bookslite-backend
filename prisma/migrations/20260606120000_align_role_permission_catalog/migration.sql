INSERT INTO "platform_modules" (
  "code",
  "name",
  "sort_order",
  "is_active",
  "updated_at"
)
VALUES
  ('maintenance', 'Maintenance', 10, true, CURRENT_TIMESTAMP),
  (
    'reporting-analytics',
    'Reporting & Analytics',
    90,
    true,
    CURRENT_TIMESTAMP
  )
ON CONFLICT ("code") DO UPDATE
SET
  "name" = EXCLUDED."name",
  "is_active" = true,
  "updated_at" = CURRENT_TIMESTAMP;

INSERT INTO "permissions" (
  "module_id",
  "code",
  "name",
  "scope_level",
  "requires_company_context",
  "is_active",
  "updated_at"
)
SELECT
  "module"."id",
  "catalog"."code",
  "catalog"."name",
  'BRANCH'::"AccessScopeLevel",
  true,
  true,
  CURRENT_TIMESTAMP
FROM (
  VALUES
    ('maintenance', 'maintenance-item-management', 'Item Management'),
    ('reporting-analytics', 'reports-financial', 'Financial Reports'),
    ('reporting-analytics', 'reports-inventory', 'Inventory Reports'),
    ('reporting-analytics', 'reports-bir', 'BIR Reports')
) AS "catalog" ("module_code", "code", "name")
JOIN "platform_modules" AS "module"
  ON "module"."code" = "catalog"."module_code"
ON CONFLICT ("code") DO UPDATE
SET
  "module_id" = EXCLUDED."module_id",
  "name" = EXCLUDED."name",
  "scope_level" = EXCLUDED."scope_level",
  "is_active" = true,
  "updated_at" = CURRENT_TIMESTAMP;

WITH "permission_groups" AS (
  SELECT
    "role_permission"."company_role_id",
    CASE
      WHEN "permission"."code" IN (
        'maintenance-items',
        'maintenance-item-category',
        'maintenance-item-type'
      ) THEN 'maintenance-item-management'
      WHEN "permission"."code" LIKE 'reports-inventory-%' THEN 'reports-inventory'
      WHEN "permission"."code" LIKE 'reports-bir-%' THEN 'reports-bir'
      WHEN "permission"."code" IN (
        'reports-books-of-accounts',
        'reports-general-ledger',
        'reports-beginning-balance-general-ledger-uploader',
        'reports-beginning-balance-subsidiary-ledger-uploader',
        'reports-budget-uploader',
        'reports-verifier',
        'reports-journal-ledger',
        'reports-trial-balance',
        'reports-balance-sheet',
        'reports-income-statement',
        'reports-cash-flow',
        'reports-ar-aging',
        'reports-ar-statement'
      ) THEN 'reports-financial'
      ELSE NULL
    END AS "target_code",
    BOOL_OR("role_permission"."can_view") AS "can_view",
    BOOL_OR("role_permission"."can_create") AS "can_create",
    BOOL_OR("role_permission"."can_update") AS "can_update",
    BOOL_OR("role_permission"."can_delete") AS "can_delete",
    BOOL_OR("role_permission"."can_approve") AS "can_approve",
    BOOL_OR("role_permission"."can_export") AS "can_export"
  FROM "company_role_permissions" AS "role_permission"
  JOIN "permissions" AS "permission"
    ON "permission"."id" = "role_permission"."permission_id"
  GROUP BY
    "role_permission"."company_role_id",
    CASE
      WHEN "permission"."code" IN (
        'maintenance-items',
        'maintenance-item-category',
        'maintenance-item-type'
      ) THEN 'maintenance-item-management'
      WHEN "permission"."code" LIKE 'reports-inventory-%' THEN 'reports-inventory'
      WHEN "permission"."code" LIKE 'reports-bir-%' THEN 'reports-bir'
      WHEN "permission"."code" IN (
        'reports-books-of-accounts',
        'reports-general-ledger',
        'reports-beginning-balance-general-ledger-uploader',
        'reports-beginning-balance-subsidiary-ledger-uploader',
        'reports-budget-uploader',
        'reports-verifier',
        'reports-journal-ledger',
        'reports-trial-balance',
        'reports-balance-sheet',
        'reports-income-statement',
        'reports-cash-flow',
        'reports-ar-aging',
        'reports-ar-statement'
      ) THEN 'reports-financial'
      ELSE NULL
    END
)
INSERT INTO "company_role_permissions" (
  "company_role_id",
  "permission_id",
  "can_view",
  "can_create",
  "can_update",
  "can_delete",
  "can_approve",
  "can_export",
  "updated_at"
)
SELECT
  "permission_groups"."company_role_id",
  "target_permission"."id",
  "permission_groups"."can_view",
  "permission_groups"."can_create",
  "permission_groups"."can_update",
  "permission_groups"."can_delete",
  "permission_groups"."can_approve",
  "permission_groups"."can_export",
  CURRENT_TIMESTAMP
FROM "permission_groups"
JOIN "permissions" AS "target_permission"
  ON "target_permission"."code" = "permission_groups"."target_code"
WHERE "permission_groups"."target_code" IS NOT NULL
ON CONFLICT ("company_role_id", "permission_id") DO UPDATE
SET
  "can_view" = EXCLUDED."can_view",
  "can_create" = EXCLUDED."can_create",
  "can_update" = EXCLUDED."can_update",
  "can_delete" = EXCLUDED."can_delete",
  "can_approve" = EXCLUDED."can_approve",
  "can_export" = EXCLUDED."can_export",
  "updated_at" = CURRENT_TIMESTAMP;

DELETE FROM "company_role_permissions"
WHERE "permission_id" IN (
  SELECT "id"
  FROM "permissions"
  WHERE
    "code" IN (
      'maintenance-items',
      'maintenance-item-category',
      'maintenance-item-type',
      'inventory-goods-issue',
      'inventory-delivery-receipt'
    )
    OR (
      "code" LIKE 'reports-%'
      AND "code" NOT IN (
        'reports-maintenance',
        'reports-financial',
        'reports-inventory',
        'reports-bir'
      )
    )
);

DELETE FROM "membership_permissions"
WHERE "permission_id" IN (
  SELECT "id"
  FROM "permissions"
  WHERE
    "code" IN (
      'maintenance-items',
      'maintenance-item-category',
      'maintenance-item-type',
      'inventory-goods-issue',
      'inventory-delivery-receipt'
    )
    OR (
      "code" LIKE 'reports-%'
      AND "code" NOT IN (
        'reports-maintenance',
        'reports-financial',
        'reports-inventory',
        'reports-bir'
      )
    )
);

UPDATE "permissions"
SET
  "is_active" = false,
  "updated_at" = CURRENT_TIMESTAMP
WHERE
  "code" IN (
    'maintenance-items',
    'maintenance-item-category',
    'maintenance-item-type',
    'inventory-goods-issue',
    'inventory-delivery-receipt'
  )
  OR (
    "code" LIKE 'reports-%'
    AND "code" NOT IN (
      'reports-maintenance',
      'reports-financial',
      'reports-inventory',
      'reports-bir'
    )
  );
