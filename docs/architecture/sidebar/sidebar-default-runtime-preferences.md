# Sidebar Runtime Defaults and Preferences

## Overview

Sidebar rendering no longer depends on materialized per-user sidebar rows.

The runtime default sidebar is derived from the SaaS entitlement source of
truth:

```text
Company
  -> active CompanySubscription
  -> SubscriptionPlan
  -> SubscriptionPlanSystem
  -> ModuleSystem
  -> active ModuleSystemModule
  -> ModuleSystemSidebar templates
  -> active Modules
```

If no customization exists, `/auth/me` returns this default sidebar directly.

## Runtime Behavior

`SidebarBuilder` now builds navigation in this order:

1. Resolve enabled modules from the active company subscription plan.
2. Filter modules by user permissions/admin access.
3. Load sidebar templates from the active module systems in the plan.
4. Build the default sidebar tree from module-system templates.
5. Add fallback module links only for entitled modules not represented by the
   template.
6. Merge user preference deltas.

The old `platform_module_sidebar_items` table has been retired and is dropped
by migration. Runtime sidebar loading must not depend on materialized sidebar
rows.

## User Preferences

User customization is stored in `user_sidebar_preferences`.

Each row is a delta for one default sidebar item:

- `item_key`
- `is_hidden`
- `sort_order`
- `is_pinned`
- `is_collapsed`

Preferences are scoped by:

```text
company_id
branch_unit_id
user_id
item_key
```

This means default sidebar ownership stays with platform metadata, while user
customization stores only personal display choices.

## Customization API

The customization endpoint still returns a sidebar tree, but the tree is built
from the same plan-derived default used by `/auth/me`.

When saving customization:

1. The submitted tree is validated against the default tree.
2. Unknown item keys are rejected.
3. Submitted links must still reference permitted modules.
4. Missing default items are stored as hidden preferences.
5. Reordered, pinned, or collapsed items are stored as preference rows.
6. Existing preference rows for the scope are replaced.

Reset deletes preference rows for the scope. The next load returns the default
sidebar automatically.

## Removed Materialized Rows

`platform_module_sidebar_items` has been removed. Legacy tooling and one-time
repair scripts must repair subscriptions, plan metadata, module-system sidebar
templates, or user preference rows instead.

The following are intentionally not part of normal runtime anymore:

- provisioning user sidebar materialization
- onboarding sidebar materialization
- workspace company creation sidebar materialization
- branch creation sidebar materialization

The explicit materialization script has been removed.

## Deployment Notes

Run the new migration before deploying this change:

```bash
npm run db:migrate:staging
```

Recommended staging sequence:

```bash
npm run db:migrate:staging
npm run db:provision:staging
npm run db:verify-permissions:staging
npm run build
```

Backfill scripts are no longer needed for normal sidebar rendering. They should
only be used when auditing or repairing legacy stored data.

## Why This Is Cleaner

The source of truth is now separated:

- SaaS plan/module-system metadata defines what the company can access.
- Permission logic defines what the user can see.
- Sidebar templates define the default navigation structure.
- User preference rows define personal UI deltas.

This avoids copying default sidebar rows for every user, company, and branch.
It also means new modules added to a plan can appear automatically without
requiring user-sidebar backfills.
