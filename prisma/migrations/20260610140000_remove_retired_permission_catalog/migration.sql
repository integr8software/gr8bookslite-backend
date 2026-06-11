DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "company_role_permissions" AS "assignment"
    JOIN "permissions" AS "permission"
      ON "permission"."id" = "assignment"."permission_id"
    WHERE "permission"."is_active" = false
  ) THEN
    RAISE EXCEPTION
      'Cannot remove retired permissions while company role assignments still reference them.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "membership_permissions" AS "override"
    JOIN "permissions" AS "permission"
      ON "permission"."id" = "override"."permission_id"
    WHERE "permission"."is_active" = false
  ) THEN
    RAISE EXCEPTION
      'Cannot remove retired permissions while membership overrides still reference them.';
  END IF;
END $$;

DELETE FROM "permissions"
WHERE "is_active" = false;

DELETE FROM "platform_submodules" AS "submodule"
WHERE
  "submodule"."is_active" = false
  AND NOT EXISTS (
    SELECT 1
    FROM "permissions" AS "permission"
    WHERE "permission"."submodule_id" = "submodule"."id"
  );

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "platform_submodules"
    WHERE "is_active" = false
  ) THEN
    RAISE EXCEPTION
      'Inactive submodules remain because active permission data still depends on them.';
  END IF;
END $$;
