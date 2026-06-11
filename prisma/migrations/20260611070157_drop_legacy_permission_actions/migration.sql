/*
  Warnings:

  - You are about to drop the column `can_approve` on the `company_role_permissions` table. All the data in the column will be lost.
  - You are about to drop the column `can_delete` on the `company_role_permissions` table. All the data in the column will be lost.
  - You are about to drop the column `can_approve` on the `membership_permissions` table. All the data in the column will be lost.
  - You are about to drop the column `can_delete` on the `membership_permissions` table. All the data in the column will be lost.

*/
-- Refuse to remove the legacy delete columns unless every grant has already
-- been migrated to the active cancel action.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "company_role_permissions"
    WHERE "can_delete" = true
      AND "can_cancel" = false
  ) THEN
    RAISE EXCEPTION
      'Cannot drop company_role_permissions.can_delete before all delete grants are migrated to cancel.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "membership_permissions"
    WHERE "can_delete" IS NOT NULL
      AND "can_cancel" IS DISTINCT FROM "can_delete"
  ) THEN
    RAISE EXCEPTION
      'Cannot drop membership_permissions.can_delete before all delete overrides are migrated to cancel.';
  END IF;
END $$;

-- AlterTable
ALTER TABLE "company_role_permissions" DROP COLUMN "can_approve",
DROP COLUMN "can_delete";

-- AlterTable
ALTER TABLE "membership_permissions" DROP COLUMN "can_approve",
DROP COLUMN "can_delete";
