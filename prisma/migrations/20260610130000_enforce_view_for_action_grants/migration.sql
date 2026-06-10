UPDATE "company_role_permissions"
SET
  "can_view" = true,
  "updated_at" = CURRENT_TIMESTAMP
WHERE
  "can_view" = false
  AND (
    "can_create" = true
    OR "can_update" = true
    OR "can_cancel" = true
    OR "can_uncancel" = true
    OR "can_export" = true
  );

UPDATE "membership_permissions"
SET
  "can_view" = true,
  "updated_at" = CURRENT_TIMESTAMP
WHERE
  "can_view" IS DISTINCT FROM true
  AND (
    "can_create" = true
    OR "can_update" = true
    OR "can_cancel" = true
    OR "can_uncancel" = true
    OR "can_export" = true
  );
