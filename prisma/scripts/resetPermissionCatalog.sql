-- This file is executed only by resetPermissionCatalog.ts after local-host and
-- confirmation checks. The caller wraps this file and the catalog rebuild
-- migrations in one PostgreSQL transaction.

DELETE FROM "membership_permissions";
DELETE FROM "company_roles";
DELETE FROM "platform_modules";

ALTER SEQUENCE IF EXISTS "membership_permissions_id_seq" RESTART WITH 1;
ALTER SEQUENCE IF EXISTS "company_role_permissions_id_seq" RESTART WITH 1;
ALTER SEQUENCE IF EXISTS "company_roles_id_seq" RESTART WITH 1;
ALTER SEQUENCE IF EXISTS "permissions_id_seq" RESTART WITH 1;
ALTER SEQUENCE IF EXISTS "platform_submodules_id_seq" RESTART WITH 1;
ALTER SEQUENCE IF EXISTS "platform_modules_id_seq" RESTART WITH 1;
ALTER SEQUENCE IF EXISTS "company_modules_id_seq" RESTART WITH 1;
ALTER SEQUENCE IF EXISTS "form_signatory_rows_id_seq" RESTART WITH 1;
ALTER SEQUENCE IF EXISTS "form_signatory_setups_id_seq" RESTART WITH 1;
