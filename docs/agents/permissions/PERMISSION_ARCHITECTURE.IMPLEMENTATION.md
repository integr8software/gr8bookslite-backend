# Permission Architecture Implementation

## Implemented

- Added `platform_submodules` and backfilled one submodule for every existing permission.
- Added explicit `permissions.target_type` and `permissions.submodule_id`.
- Added target and module/submodule consistency constraints.
- Removed the redundant single-column permission/submodule foreign key after
  representing the stronger composite module-consistency relation in Prisma.
- Added `can_cancel` and `can_uncancel` while retaining legacy `can_delete` and `can_approve`.
- Copied existing delete grants and overrides into cancel during migration.
- Added the backend-owned permission catalog endpoint:
  `GET /api/v1/company/units/:unitId/roles/permission-catalog`.
- Changed role writes to validate existing permission codes instead of upserting catalog rows.
- Added the preferred `{ permissionCode, actions }` role payload while retaining legacy boolean payload compatibility.
- Updated effective permission resolution for submodule targets, cancel, and uncancel.
- Updated the User Role screen to fetch the backend catalog and show:
  `View`, `Create`, `Update`, `Cancel`, `Uncancel`, and `Export`.
- Updated the User Role matrix, counts, and bulk controls to honor each
  submodule's action list from the backend catalog.
- Blocked role saves until the backend permission catalog has loaded.
- Removed active Delete and Approve controls from the User Role screen.
- Kept module codes as descriptive lowercase slugs and migrated all submodule
  and permission codes to stable uppercase abbreviations.
- Added an idempotent backend catalog migration for all 65 current sidebar
  resources, including routes and deterministic module/submodule ordering.
- Added focused regression tests for preferred and legacy role payloads,
  unsupported codes/actions, catalog order, short-code module resolution, and
  deprecated action suppression.
- Corrected the legacy replenishment migration so membership overrides are
  merged with null-as-inherit semantics and explicit conflicts abort the
  migration instead of silently dropping data.
- Added an additive normalization migration so active create, update, cancel,
  uncancel, or export grants always imply view for roles and membership
  overrides.
- Updated the Users controller guard to use the active backend-owned Users
  permission code.
- Removed the Form Signatory runtime module upsert. It now resolves only an
  existing active backend catalog module and ignores frontend-submitted module
  names.
- Effective-access and role response queries now require the permission,
  submodule, and owning module to all be active.
- Removed retired permission and submodule catalog rows after verifying that no
  role assignments or membership overrides referenced them.

## Deployment Order

1. Deploy the backend migration and backend application.
2. Verify the catalog endpoint and existing roles.
3. Deploy the frontend application.
4. Test creating and editing a role.

The backend remains compatible with the legacy role payload during rollout. The
new frontend requires the new catalog endpoint.

## DBeaver Verification

The same invariant checks can be run locally with:

```bash
npm run db:verify-permissions:local
```

The verifier also confirms the expected 12-module/65-resource catalog and that
each active submodule has exactly one active permission with the same stable
code.

Run these counts before and after applying the migration. The assignment counts
must not decrease unexpectedly. They may increase when one legacy aggregate
permission is intentionally expanded into multiple canonical leaf permissions.

```sql
SELECT COUNT(*) AS role_permission_count
FROM company_role_permissions;

SELECT COUNT(*) AS membership_override_count
FROM membership_permissions;
```

Confirm every permission has a valid explicit target:

```sql
SELECT
  p.id,
  p.code,
  p.target_type,
  m.code AS module_code,
  sm.code AS submodule_code
FROM permissions p
LEFT JOIN platform_modules m ON m.id = p.module_id
LEFT JOIN platform_submodules sm ON sm.id = p.submodule_id
WHERE
  (p.target_type = 'MODULE' AND (p.module_id IS NULL OR p.submodule_id IS NOT NULL))
  OR
  (p.target_type = 'SUBMODULE' AND (p.module_id IS NULL OR p.submodule_id IS NULL));
```

The query above must return zero rows.

Confirm every submodule-target permission belongs to the same module:

```sql
SELECT p.code, p.module_id, sm.module_id AS submodule_module_id
FROM permissions p
JOIN platform_submodules sm ON sm.id = p.submodule_id
WHERE p.module_id <> sm.module_id;
```

The query above must return zero rows.

Confirm legacy delete values were copied to cancel:

```sql
SELECT COUNT(*) AS missing_role_cancel_migrations
FROM company_role_permissions
WHERE can_delete = true AND can_cancel = false;

SELECT COUNT(*) AS missing_override_cancel_migrations
FROM membership_permissions
WHERE can_delete IS NOT NULL AND can_cancel IS DISTINCT FROM can_delete;
```

Both queries must return zero.

Confirm assignments no longer point to inactive legacy permissions:

```sql
SELECT COUNT(*) AS role_assignments_to_inactive_permissions
FROM company_role_permissions rp
JOIN permissions p ON p.id = rp.permission_id
WHERE p.is_active = false;

SELECT COUNT(*) AS overrides_to_inactive_permissions
FROM membership_permissions mp
JOIN permissions p ON p.id = mp.permission_id
WHERE p.is_active = false;
```

Both queries must return zero.

## Local Verification Result

The migrations were applied successfully to the local PostgreSQL development
database on June 10, 2026.

```txt
Active modules: 12
Active submodules: 65
Active permissions: 65
Inactive submodules: 0
Inactive permissions: 0
Invalid permission targets: 0
Module/submodule mismatches: 0
Role assignments to inactive permissions: 0
Membership overrides to inactive permissions: 0
Delete grants missing their cancel migration: 0
PCFR module code: cash-disbursement
PCFR submodule code: PCFR
```

Role-assignment rows changed from 131 to 137 because the legacy aggregate
`maintenance-item-management` grant was expanded to the three canonical leaf
permissions. No legacy assignment rows remain attached to inactive
permissions.

The complete 48-migration chain was also applied to a newly created temporary
database. The permission architecture verifier passed on that fresh database,
`prisma migrate status` reported it up to date, and `prisma migrate diff`
reported no difference between the migrated database and `schema.prisma`.

A separate pre-refactor fixture database verified data preservation with
overlapping legacy and target rows:

- role action flags merged using OR logic,
- membership overrides retained explicit `true` and `false` values,
- nullable overrides continued to mean inherit,
- legacy assignments were removed only after the canonical `PCFR` assignment
  existed.

The same overlapping-row fixture was repeated for `APV`; the canonical row
received the OR-merged role grants and null-aware membership overrides before
the long-code row was deactivated.

The frontend sidebar and backend catalog migration were compared after the
catalog seed: both contain the same 65 active leaf resources, with no missing
or extra entries.

## Intentionally Deferred

Module codes remain descriptive lowercase slugs, such as `cash-disbursement`
and `system-administration`. Submodule and permission codes use globally unique
uppercase abbreviations based on the submodule name, such as `COA` for Chart of
Accounts and `PCFR` for Petty Cash Fund Replenishment.

Natural acronym collisions are resolved with a minimally expanded code:
`DSM` for Discount Management, `PVR` for Provisional Receipt, `BIRR` for BIR
Reports, and `SVI` for Service Invoice. The migration preserves submodule and
permission IDs, so existing role grants and membership overrides remain linked.

## Local Catalog Reset

Use the guarded local reset only when old development data should be discarded
instead of migrated. Preview the affected row counts first:

```sh
npm run db:reset-permission-catalog:local
```

The preview changes nothing. To permanently remove the old catalog and roles,
then rebuild the canonical catalog in one PostgreSQL transaction:

```sh
npm run db:reset-permission-catalog:local -- --confirm=RESET_PERMISSION_CATALOG
npm run db:verify-permissions:local
```

The command accepts only a local PostgreSQL host. It removes all company roles,
role permission assignments, membership permission overrides, company module
selections, and form signatory setups. Users, companies, memberships, and audit
logs are preserved. Audit-log rows that referenced an old module retain the log
but have a null module reference.

The rebuilt catalog uses descriptive lowercase slug codes for modules and
uppercase abbreviation codes for submodules and permissions.

In DBeaver, refresh the `public` schema after the reset and verify the result:

```sql
SELECT COUNT(*) FROM platform_modules;       -- 12
SELECT COUNT(*) FROM platform_submodules;    -- 65
SELECT COUNT(*) FROM permissions;            -- 65
SELECT COUNT(*) FROM company_roles;          -- 0 after a full reset
SELECT COUNT(*) FROM company_role_permissions; -- 0 after a full reset
SELECT COUNT(*) FROM membership_permissions; -- 0 after a full reset
```
