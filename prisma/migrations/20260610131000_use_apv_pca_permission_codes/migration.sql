CREATE TEMPORARY TABLE "short_permission_code_mappings" (
  "source_code" TEXT NOT NULL,
  "target_code" TEXT NOT NULL
) ON COMMIT DROP;

INSERT INTO "short_permission_code_mappings" ("source_code", "target_code")
VALUES
  ('accounts-payable-accounts-payable-voucher', 'APV'),
  ('cash-disbursement-petty-cash-advance', 'PCA');

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "short_permission_code_mappings" AS "mapping"
    JOIN "permissions" AS "source_permission"
      ON "source_permission"."code" = "mapping"."source_code"
    LEFT JOIN "permissions" AS "target_permission"
      ON "target_permission"."code" = "mapping"."target_code"
    JOIN "platform_submodules" AS "target_submodule"
      ON "target_submodule"."code" = "mapping"."target_code"
    WHERE "target_permission"."id" IS NULL
  ) THEN
    RAISE EXCEPTION
      'Cannot rename permission because its target submodule code already exists.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "short_permission_code_mappings" AS "mapping"
    JOIN "permissions" AS "source_permission"
      ON "source_permission"."code" = "mapping"."source_code"
    JOIN "permissions" AS "target_permission"
      ON "target_permission"."code" = "mapping"."target_code"
    JOIN "membership_permissions" AS "source"
      ON "source"."permission_id" = "source_permission"."id"
    JOIN "membership_permissions" AS "target"
      ON "target"."membership_user_id" = "source"."membership_user_id"
      AND "target"."membership_company_id" = "source"."membership_company_id"
      AND "target"."permission_id" = "target_permission"."id"
    WHERE
      (
        "source"."can_view" IS NOT NULL
        AND "target"."can_view" IS NOT NULL
        AND "source"."can_view" <> "target"."can_view"
      )
      OR (
        "source"."can_create" IS NOT NULL
        AND "target"."can_create" IS NOT NULL
        AND "source"."can_create" <> "target"."can_create"
      )
      OR (
        "source"."can_update" IS NOT NULL
        AND "target"."can_update" IS NOT NULL
        AND "source"."can_update" <> "target"."can_update"
      )
      OR (
        "source"."can_delete" IS NOT NULL
        AND "target"."can_delete" IS NOT NULL
        AND "source"."can_delete" <> "target"."can_delete"
      )
      OR (
        "source"."can_approve" IS NOT NULL
        AND "target"."can_approve" IS NOT NULL
        AND "source"."can_approve" <> "target"."can_approve"
      )
      OR (
        "source"."can_cancel" IS NOT NULL
        AND "target"."can_cancel" IS NOT NULL
        AND "source"."can_cancel" <> "target"."can_cancel"
      )
      OR (
        "source"."can_uncancel" IS NOT NULL
        AND "target"."can_uncancel" IS NOT NULL
        AND "source"."can_uncancel" <> "target"."can_uncancel"
      )
      OR (
        "source"."can_export" IS NOT NULL
        AND "target"."can_export" IS NOT NULL
        AND "source"."can_export" <> "target"."can_export"
      )
  ) THEN
    RAISE EXCEPTION
      'Cannot merge short permission codes because membership overrides contain conflicting explicit values.';
  END IF;
END $$;

INSERT INTO "company_role_permissions" (
  "company_role_id",
  "permission_id",
  "can_view",
  "can_create",
  "can_update",
  "can_delete",
  "can_approve",
  "can_cancel",
  "can_uncancel",
  "can_export",
  "updated_at"
)
SELECT
  "source"."company_role_id",
  "target_permission"."id",
  "source"."can_view",
  "source"."can_create",
  "source"."can_update",
  "source"."can_delete",
  "source"."can_approve",
  "source"."can_cancel",
  "source"."can_uncancel",
  "source"."can_export",
  CURRENT_TIMESTAMP
FROM "short_permission_code_mappings" AS "mapping"
JOIN "permissions" AS "source_permission"
  ON "source_permission"."code" = "mapping"."source_code"
JOIN "permissions" AS "target_permission"
  ON "target_permission"."code" = "mapping"."target_code"
JOIN "company_role_permissions" AS "source"
  ON "source"."permission_id" = "source_permission"."id"
ON CONFLICT ("company_role_id", "permission_id") DO UPDATE
SET
  "can_view" = "company_role_permissions"."can_view" OR EXCLUDED."can_view",
  "can_create" = "company_role_permissions"."can_create" OR EXCLUDED."can_create",
  "can_update" = "company_role_permissions"."can_update" OR EXCLUDED."can_update",
  "can_delete" = "company_role_permissions"."can_delete" OR EXCLUDED."can_delete",
  "can_approve" = "company_role_permissions"."can_approve" OR EXCLUDED."can_approve",
  "can_cancel" = "company_role_permissions"."can_cancel" OR EXCLUDED."can_cancel",
  "can_uncancel" = "company_role_permissions"."can_uncancel" OR EXCLUDED."can_uncancel",
  "can_export" = "company_role_permissions"."can_export" OR EXCLUDED."can_export",
  "updated_at" = CURRENT_TIMESTAMP;

INSERT INTO "membership_permissions" (
  "membership_user_id",
  "membership_company_id",
  "permission_id",
  "can_view",
  "can_create",
  "can_update",
  "can_delete",
  "can_approve",
  "can_cancel",
  "can_uncancel",
  "can_export",
  "updated_at"
)
SELECT
  "source"."membership_user_id",
  "source"."membership_company_id",
  "target_permission"."id",
  "source"."can_view",
  "source"."can_create",
  "source"."can_update",
  "source"."can_delete",
  "source"."can_approve",
  "source"."can_cancel",
  "source"."can_uncancel",
  "source"."can_export",
  CURRENT_TIMESTAMP
FROM "short_permission_code_mappings" AS "mapping"
JOIN "permissions" AS "source_permission"
  ON "source_permission"."code" = "mapping"."source_code"
JOIN "permissions" AS "target_permission"
  ON "target_permission"."code" = "mapping"."target_code"
JOIN "membership_permissions" AS "source"
  ON "source"."permission_id" = "source_permission"."id"
ON CONFLICT (
  "membership_user_id",
  "membership_company_id",
  "permission_id"
) DO UPDATE
SET
  "can_view" = COALESCE("membership_permissions"."can_view", EXCLUDED."can_view"),
  "can_create" = COALESCE("membership_permissions"."can_create", EXCLUDED."can_create"),
  "can_update" = COALESCE("membership_permissions"."can_update", EXCLUDED."can_update"),
  "can_delete" = COALESCE("membership_permissions"."can_delete", EXCLUDED."can_delete"),
  "can_approve" = COALESCE("membership_permissions"."can_approve", EXCLUDED."can_approve"),
  "can_cancel" = COALESCE("membership_permissions"."can_cancel", EXCLUDED."can_cancel"),
  "can_uncancel" = COALESCE("membership_permissions"."can_uncancel", EXCLUDED."can_uncancel"),
  "can_export" = COALESCE("membership_permissions"."can_export", EXCLUDED."can_export"),
  "updated_at" = CURRENT_TIMESTAMP;

DELETE FROM "company_role_permissions" AS "assignment"
USING "permissions" AS "source_permission",
      "permissions" AS "target_permission",
      "short_permission_code_mappings" AS "mapping"
WHERE
  "source_permission"."code" = "mapping"."source_code"
  AND "target_permission"."code" = "mapping"."target_code"
  AND "assignment"."permission_id" = "source_permission"."id";

DELETE FROM "membership_permissions" AS "override"
USING "permissions" AS "source_permission",
      "permissions" AS "target_permission",
      "short_permission_code_mappings" AS "mapping"
WHERE
  "source_permission"."code" = "mapping"."source_code"
  AND "target_permission"."code" = "mapping"."target_code"
  AND "override"."permission_id" = "source_permission"."id";

UPDATE "permissions" AS "source_permission"
SET
  "is_active" = false,
  "updated_at" = CURRENT_TIMESTAMP
FROM "permissions" AS "target_permission",
     "short_permission_code_mappings" AS "mapping"
WHERE
  "source_permission"."code" = "mapping"."source_code"
  AND "target_permission"."code" = "mapping"."target_code";

UPDATE "platform_submodules" AS "source_submodule"
SET
  "is_active" = false,
  "updated_at" = CURRENT_TIMESTAMP
FROM "permissions" AS "target_permission",
     "short_permission_code_mappings" AS "mapping"
WHERE
  "source_submodule"."code" = "mapping"."source_code"
  AND "target_permission"."code" = "mapping"."target_code";

UPDATE "platform_submodules" AS "source_submodule"
SET
  "code" = "mapping"."target_code",
  "updated_at" = CURRENT_TIMESTAMP
FROM "short_permission_code_mappings" AS "mapping"
LEFT JOIN "permissions" AS "target_permission"
  ON "target_permission"."code" = "mapping"."target_code"
WHERE
  "source_submodule"."code" = "mapping"."source_code"
  AND "target_permission"."id" IS NULL;

UPDATE "permissions" AS "source_permission"
SET
  "code" = "mapping"."target_code",
  "updated_at" = CURRENT_TIMESTAMP
FROM "short_permission_code_mappings" AS "mapping"
LEFT JOIN "permissions" AS "target_permission"
  ON "target_permission"."code" = "mapping"."target_code"
WHERE
  "source_permission"."code" = "mapping"."source_code"
  AND "target_permission"."id" IS NULL;
