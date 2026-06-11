INSERT INTO "platform_modules" (
  "code",
  "name",
  "sort_order",
  "is_active",
  "updated_at"
)
VALUES (
  'cash-disbursement',
  'Cash Disbursement',
  40,
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
    (
      'cash-disbursement-petty-cash-fund-replenishment',
      'Petty Cash Fund Replenishment'
    ),
    (
      'cash-disbursement-petty-cash-advance-replenishment',
      'Petty Cash Advance Replenishment'
    )
) AS "catalog" ("code", "name")
JOIN "platform_modules" AS "module"
  ON "module"."code" = 'cash-disbursement'
ON CONFLICT ("code") DO UPDATE
SET
  "module_id" = EXCLUDED."module_id",
  "name" = EXCLUDED."name",
  "scope_level" = EXCLUDED."scope_level",
  "is_active" = true,
  "updated_at" = CURRENT_TIMESTAMP;

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
  "legacy_role_permission"."company_role_id",
  "target_permission"."id",
  "legacy_role_permission"."can_view",
  "legacy_role_permission"."can_create",
  "legacy_role_permission"."can_update",
  "legacy_role_permission"."can_delete",
  "legacy_role_permission"."can_approve",
  "legacy_role_permission"."can_export",
  CURRENT_TIMESTAMP
FROM "company_role_permissions" AS "legacy_role_permission"
JOIN "permissions" AS "legacy_permission"
  ON "legacy_permission"."id" = "legacy_role_permission"."permission_id"
JOIN "permissions" AS "target_permission"
  ON "target_permission"."code" =
    'cash-disbursement-petty-cash-fund-replenishment'
WHERE
  "legacy_permission"."code" =
    'cash-disbursement-petty-cash-replenishment'
ON CONFLICT ("company_role_id", "permission_id") DO UPDATE
SET
  "can_view" =
    "company_role_permissions"."can_view" OR EXCLUDED."can_view",
  "can_create" =
    "company_role_permissions"."can_create" OR EXCLUDED."can_create",
  "can_update" =
    "company_role_permissions"."can_update" OR EXCLUDED."can_update",
  "can_delete" =
    "company_role_permissions"."can_delete" OR EXCLUDED."can_delete",
  "can_approve" =
    "company_role_permissions"."can_approve" OR EXCLUDED."can_approve",
  "can_export" =
    "company_role_permissions"."can_export" OR EXCLUDED."can_export",
  "updated_at" = CURRENT_TIMESTAMP;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "membership_permissions" AS "legacy"
    JOIN "permissions" AS "legacy_permission"
      ON "legacy_permission"."id" = "legacy"."permission_id"
    JOIN "membership_permissions" AS "target"
      ON "target"."membership_user_id" = "legacy"."membership_user_id"
      AND "target"."membership_company_id" = "legacy"."membership_company_id"
    JOIN "permissions" AS "target_permission"
      ON "target_permission"."id" = "target"."permission_id"
    WHERE
      "legacy_permission"."code" =
        'cash-disbursement-petty-cash-replenishment'
      AND "target_permission"."code" =
        'cash-disbursement-petty-cash-fund-replenishment'
      AND (
        (
          "legacy"."can_view" IS NOT NULL
          AND "target"."can_view" IS NOT NULL
          AND "legacy"."can_view" <> "target"."can_view"
        )
        OR (
          "legacy"."can_create" IS NOT NULL
          AND "target"."can_create" IS NOT NULL
          AND "legacy"."can_create" <> "target"."can_create"
        )
        OR (
          "legacy"."can_update" IS NOT NULL
          AND "target"."can_update" IS NOT NULL
          AND "legacy"."can_update" <> "target"."can_update"
        )
        OR (
          "legacy"."can_delete" IS NOT NULL
          AND "target"."can_delete" IS NOT NULL
          AND "legacy"."can_delete" <> "target"."can_delete"
        )
        OR (
          "legacy"."can_approve" IS NOT NULL
          AND "target"."can_approve" IS NOT NULL
          AND "legacy"."can_approve" <> "target"."can_approve"
        )
        OR (
          "legacy"."can_export" IS NOT NULL
          AND "target"."can_export" IS NOT NULL
          AND "legacy"."can_export" <> "target"."can_export"
        )
      )
  ) THEN
    RAISE EXCEPTION
      'Cannot merge petty cash replenishment because membership overrides contain conflicting explicit values.';
  END IF;
END $$;

INSERT INTO "membership_permissions" (
  "membership_user_id",
  "membership_company_id",
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
  "legacy_membership_permission"."membership_user_id",
  "legacy_membership_permission"."membership_company_id",
  "target_permission"."id",
  "legacy_membership_permission"."can_view",
  "legacy_membership_permission"."can_create",
  "legacy_membership_permission"."can_update",
  "legacy_membership_permission"."can_delete",
  "legacy_membership_permission"."can_approve",
  "legacy_membership_permission"."can_export",
  CURRENT_TIMESTAMP
FROM "membership_permissions" AS "legacy_membership_permission"
JOIN "permissions" AS "legacy_permission"
  ON "legacy_permission"."id" = "legacy_membership_permission"."permission_id"
JOIN "permissions" AS "target_permission"
  ON "target_permission"."code" =
    'cash-disbursement-petty-cash-fund-replenishment'
WHERE
  "legacy_permission"."code" =
    'cash-disbursement-petty-cash-replenishment'
ON CONFLICT (
  "membership_user_id",
  "membership_company_id",
  "permission_id"
) DO UPDATE
SET
  "can_view" =
    COALESCE("membership_permissions"."can_view", EXCLUDED."can_view"),
  "can_create" =
    COALESCE("membership_permissions"."can_create", EXCLUDED."can_create"),
  "can_update" =
    COALESCE("membership_permissions"."can_update", EXCLUDED."can_update"),
  "can_delete" =
    COALESCE("membership_permissions"."can_delete", EXCLUDED."can_delete"),
  "can_approve" =
    COALESCE("membership_permissions"."can_approve", EXCLUDED."can_approve"),
  "can_export" =
    COALESCE("membership_permissions"."can_export", EXCLUDED."can_export"),
  "updated_at" = CURRENT_TIMESTAMP;

DELETE FROM "company_role_permissions"
WHERE "permission_id" IN (
  SELECT "id"
  FROM "permissions"
  WHERE "code" = 'cash-disbursement-petty-cash-replenishment'
);

DELETE FROM "membership_permissions"
WHERE "permission_id" IN (
  SELECT "id"
  FROM "permissions"
  WHERE "code" = 'cash-disbursement-petty-cash-replenishment'
);

UPDATE "permissions"
SET
  "is_active" = false,
  "updated_at" = CURRENT_TIMESTAMP
WHERE "code" = 'cash-disbursement-petty-cash-replenishment';
