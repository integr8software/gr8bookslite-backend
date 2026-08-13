# Final SaaS Plan Sidebar Cleanup

## Root Cause

The sidebar regression was caused by two separate issues being mixed together:

1. A legacy migration folder for per-company module exceptions was restored locally.
2. Some frontend sidebar customization screens still behaved like the old materialized sidebar editor and could generate client-side sidebar keys that are not part of the active plan default.

The approved runtime architecture is plan-only:

```text
Company
-> CompanySubscription
-> SubscriptionPlan
-> SubscriptionPlanSystem
-> ModuleSystem
-> ModuleSystemModule
-> Module
-> ModuleSystemSidebar / SidebarBuilder
-> UserSidebarPreference
```

Runtime access must not read company-specific module grant or exception tables.

## Implementation Summary

- Removed the restored legacy migration folder:
  `prisma/migrations/20260703120000_add_company_module_exceptions`.
- Confirmed backend runtime/script source has no references to the removed company module architecture.
- Kept runtime entitlements plan-only through `EntitlementService`.
- Kept sidebar defaults derived from active subscription plan systems and module-system sidebar templates.
- Kept user customization as preference deltas stored in `user_sidebar_preferences`.
- Updated frontend sidebar rendering diagnostics to warn when `enabledModules` exists but `userModules` resolves empty.
- Updated frontend sidebar customization to stop creating arbitrary new sidebar sections/folders/modules. Customization now works over the runtime default tree.

## Migration History Repair

Do not restore the old exception migration and do not reset the database.

If a local database already recorded the removed legacy migration, remove only that stale local migration-history row:

```sql
DELETE FROM "_prisma_migrations"
WHERE migration_name = '20260703120000_add_company_module_exceptions';
```

Then rerun:

```bash
npm run db:status:local
npm run db:migrate:local
npm run db:generate:local
npm run db:validate:local
```

## Database Verification SQL

The removed legacy tables should not exist:

```sql
SELECT to_regclass('public.company_modules') AS company_modules;
SELECT to_regclass('public.company_module_exceptions') AS company_module_exceptions;
```

Verify active companies resolve modules through their latest usable subscription plan:

```sql
SELECT
  c.id AS company_id,
  c.name AS company_name,
  sp.code AS plan_code,
  COUNT(DISTINCT msm.module_id) AS plan_module_count
FROM companies c
JOIN LATERAL (
  SELECT cs.*
  FROM company_subscriptions cs
  WHERE cs.company_id = c.id
    AND cs.status IN ('INCOMPLETE', 'TRIALING', 'ACTIVE', 'PAST_DUE', 'UNPAID')
  ORDER BY cs.starts_at DESC, cs.created_at DESC
  LIMIT 1
) cs ON true
JOIN subscription_plans sp ON sp.id = cs.subscription_plan_id
JOIN subscription_plan_systems sps
  ON sps.subscription_plan_id = sp.id
  AND sps.is_enabled = true
JOIN module_systems ms
  ON ms.id = sps.system_id
  AND ms.is_active = true
JOIN module_system_modules msm
  ON msm.system_id = ms.id
  AND msm.is_active = true
JOIN modules m
  ON m.id = msm.module_id
  AND m.is_active = true
GROUP BY c.id, c.name, sp.code
ORDER BY c.id;
```

Verify active plan systems have sidebar templates:

```sql
SELECT
  c.id AS company_id,
  sp.code AS plan_code,
  ms.code AS system_code,
  COUNT(mss.id) AS sidebar_template_count
FROM companies c
JOIN LATERAL (
  SELECT cs.*
  FROM company_subscriptions cs
  WHERE cs.company_id = c.id
    AND cs.status IN ('INCOMPLETE', 'TRIALING', 'ACTIVE', 'PAST_DUE', 'UNPAID')
  ORDER BY cs.starts_at DESC, cs.created_at DESC
  LIMIT 1
) cs ON true
JOIN subscription_plans sp ON sp.id = cs.subscription_plan_id
JOIN subscription_plan_systems sps
  ON sps.subscription_plan_id = sp.id
  AND sps.is_enabled = true
JOIN module_systems ms
  ON ms.id = sps.system_id
  AND ms.is_active = true
LEFT JOIN module_system_sidebar mss
  ON mss.system_id = ms.id
  AND mss.is_visible = true
GROUP BY c.id, sp.code, ms.code
ORDER BY c.id, ms.code;
```

Verify user sidebar preferences are only deltas:

```sql
SELECT
  company_id,
  branch_unit_id,
  user_id,
  COUNT(*) AS preference_count
FROM user_sidebar_preferences
GROUP BY company_id, branch_unit_id, user_id
ORDER BY preference_count DESC;
```

## Runtime Contract

- `/auth/me` remains the frontend source of truth for:
  - `activeAccess.enabledModules`
  - `activeAccess.userModules`
- `SidebarBuilder` returns a default sidebar even when no `user_sidebar_preferences` rows exist.
- `UserSidebarService` persists only preference deltas:
  - hidden state
  - sort order
  - pinned state
  - collapsed state
- The frontend must not create unknown sidebar keys or modules outside the runtime default tree.

## Manual Test Checklist

1. Login existing user.
2. Confirm `/api/backend/auth/me` returns non-empty `activeAccess.enabledModules`.
3. Confirm `/api/backend/auth/me` returns non-empty `activeAccess.userModules.items` or a non-empty matching `byBranch[].items`.
4. Confirm sidebar renders.
5. Confirm company switch works.
6. Confirm branch switch works.
7. Save sidebar customization by reordering or hiding existing default items.
8. Reset sidebar customization and confirm the default sidebar returns.
9. Confirm frontend does not call any old company module endpoints.

## Notes

Historical migrations may still contain old table names because earlier migration history created and later dropped those objects. Do not edit already-applied historical migrations just to remove strings; that causes checksum drift and Prisma reset prompts.

## Approval Management Sidebar Verification

Approval Management is platform metadata and must be present in every plan-backed system template that includes the `AM` module.

The canonical seed keys are:

- Section: `approval-management`
- Setup link: `system-administration-approval-setup`
- Transactions link: `system-administration-approval-transactions`

The `ACCOUNTING` and `ACCOUNTING_AND_INVENTORY` sidebar templates both include this section. The platform provisioner recreates the system sidebar rows from these templates, so a missing Approval Management section is repaired by provisioning the platform catalog after deploying the corrected seed:

```bash
npm run db:provision:current
```

Do not insert `module_system_sidebar` rows manually and do not restore company-specific module or sidebar materialization. If the section is still absent after provisioning, verify that the company subscription resolves to an active plan system and that the `AM` module is active.
