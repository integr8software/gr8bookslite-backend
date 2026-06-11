DO $$
DECLARE
  "legacy_permission_id" INTEGER;
  "target_permission_id" INTEGER;
BEGIN
  SELECT "id" INTO "legacy_permission_id"
  FROM "permissions"
  WHERE "code" = 'cash-disbursement-petty-cash-fund-replenishment';

  IF "legacy_permission_id" IS NULL THEN
    RETURN;
  END IF;

  SELECT "id" INTO "target_permission_id"
  FROM "permissions"
  WHERE "code" = 'PCFR';

  IF "target_permission_id" IS NULL THEN
    UPDATE "permissions"
    SET
      "code" = 'PCFR',
      "updated_at" = CURRENT_TIMESTAMP
    WHERE "id" = "legacy_permission_id";

    UPDATE "platform_submodules"
    SET
      "code" = 'PCFR',
      "updated_at" = CURRENT_TIMESTAMP
    WHERE "code" = 'cash-disbursement-petty-cash-fund-replenishment';

    RETURN;
  END IF;

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
    "company_role_id",
    "target_permission_id",
    "can_view",
    "can_create",
    "can_update",
    "can_delete",
    "can_approve",
    "can_cancel",
    "can_uncancel",
    "can_export",
    CURRENT_TIMESTAMP
  FROM "company_role_permissions"
  WHERE "permission_id" = "legacy_permission_id"
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

  IF EXISTS (
    SELECT 1
    FROM "membership_permissions" AS "legacy"
    JOIN "membership_permissions" AS "target"
      ON "target"."membership_user_id" = "legacy"."membership_user_id"
      AND "target"."membership_company_id" = "legacy"."membership_company_id"
      AND "target"."permission_id" = "target_permission_id"
    WHERE
      "legacy"."permission_id" = "legacy_permission_id"
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
          "legacy"."can_cancel" IS NOT NULL
          AND "target"."can_cancel" IS NOT NULL
          AND "legacy"."can_cancel" <> "target"."can_cancel"
        )
        OR (
          "legacy"."can_uncancel" IS NOT NULL
          AND "target"."can_uncancel" IS NOT NULL
          AND "legacy"."can_uncancel" <> "target"."can_uncancel"
        )
        OR (
          "legacy"."can_export" IS NOT NULL
          AND "target"."can_export" IS NOT NULL
          AND "legacy"."can_export" <> "target"."can_export"
        )
      )
  ) THEN
    RAISE EXCEPTION
      'Cannot merge PCFR because membership overrides contain conflicting explicit values.';
  END IF;

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
    "membership_user_id",
    "membership_company_id",
    "target_permission_id",
    "can_view",
    "can_create",
    "can_update",
    "can_delete",
    "can_approve",
    "can_cancel",
    "can_uncancel",
    "can_export",
    CURRENT_TIMESTAMP
  FROM "membership_permissions"
  WHERE "permission_id" = "legacy_permission_id"
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

  DELETE FROM "company_role_permissions"
  WHERE "permission_id" = "legacy_permission_id";

  DELETE FROM "membership_permissions"
  WHERE "permission_id" = "legacy_permission_id";

  UPDATE "permissions"
  SET
    "is_active" = false,
    "updated_at" = CURRENT_TIMESTAMP
  WHERE "id" = "legacy_permission_id";

  UPDATE "platform_submodules"
  SET
    "is_active" = false,
    "updated_at" = CURRENT_TIMESTAMP
  WHERE "code" = 'cash-disbursement-petty-cash-fund-replenishment';
END $$;
