# Permission Model Refactor Plan

## Purpose

This document is a design handoff for reviewing and improving the Gr8Books Lite role and permission database model.

The current implementation works, but its naming does not clearly represent the domain:

- `platform_modules` stores modules such as `Cash Disbursement`.
- `permissions` currently stores items shown as submodules/features, such as `Petty Cash Fund Replenishment`.
- `company_role_permissions` and `membership_permissions` store the actual allowed actions through boolean columns such as `can_view`, `can_create`, and `can_update`.

Because of this, a row called a `Permission` is actually closer to a protected resource or feature. The actual permissions are the action flags stored in the join tables.

We want to improve this model without assuming that every permission must belong only to a submodule. The preferred direction is to retain a general `permissions` concept that can target either a module or a submodule.

## Project Context

Technology:

- NestJS backend
- Prisma ORM
- PostgreSQL
- Next.js frontend

Environment workflow:

- Local development uses local PostgreSQL through `.env`.
- Render staging uses Neon through Render environment variables.
- Schema changes are created locally as Prisma migrations and deployed with `prisma migrate deploy`.

Current user-role workflow:

1. The frontend sidebar registry defines modules and submodules.
2. The frontend User Role screen derives its permission options from that sidebar registry.
3. A role submission sends module and submodule codes/names with action flags to the backend.
4. The backend upserts `platform_modules` and `permissions`.
5. The backend stores role action grants in `company_role_permissions`.
6. Optional user-specific overrides are stored in `membership_permissions`.

Recent progress:

- User Role permissions now read directly from the canonical frontend sidebar module registry.
- `Petty Cash Replenishment` was renamed to `Petty Cash Fund Replenishment`.
- `Petty Cash Advance Replenishment` was added after `Petty Cash Advance`.
- A backend migration was prepared to migrate the legacy permission code while preserving role and membership assignments.
- The backend normalizes old permission submissions to the new canonical code and label.

## Current Database Model

Simplified current structure:

```text
platform_modules
  id
  code
  name
  sort_order
  is_active

permissions
  id
  module_id
  code
  name
  scope_level
  requires_company_context
  is_active

company_role_permissions
  company_role_id
  permission_id
  can_view
  can_create
  can_update
  can_delete
  can_approve
  can_export

membership_permissions
  membership_user_id
  membership_company_id
  permission_id
  can_view
  can_create
  can_update
  can_delete
  can_approve
  can_export
```

Example:

```text
platform_modules:
  code = cash-disbursement
  name = Cash Disbursement

permissions:
  code = cash-disbursement-petty-cash-fund-replenishment
  name = Petty Cash Fund Replenishment
```

The `permissions` row represents a submodule/feature, while the allowed actions are stored in `company_role_permissions`.

## Why Not Name Everything `SubmodulePermission`?

Names such as `company_role_submodule_permissions` are clearer than the current model only if every protected resource will always be a submodule.

That assumption may be too restrictive. Gr8Books may need to grant access at multiple levels:

- Module-level permission: allow access to the entire Cash Disbursement module.
- Submodule-level permission: allow access to Petty Cash Fund Replenishment.
- Future feature-level or operation-level permission: allow posting, closing, or approving a specific workflow.

Therefore, a general `permissions` table can still be appropriate. The improvement is to make its target explicit instead of treating every permission row as an unnamed submodule.

## Preferred Target Model

Keep `permissions` as the general authorization resource and add a separate `platform_submodules` catalog.

```text
platform_modules
  id
  code
  name
  sort_order
  is_active

platform_submodules
  id
  module_id
  code
  name
  route
  sort_order
  is_active

permissions
  id
  code
  name
  target_type
  module_id nullable
  submodule_id nullable
  scope_level
  requires_company_context
  is_active

company_role_permissions
  company_role_id
  permission_id
  can_view
  can_create
  can_update
  can_delete
  can_approve
  can_export

membership_permissions
  membership_user_id
  membership_company_id
  permission_id
  nullable action overrides
```

Suggested `target_type` values:

```text
MODULE
SUBMODULE
```

Possible future values:

```text
FEATURE
WORKFLOW
```

Database constraints should enforce:

- `MODULE` permission: `module_id` is present and `submodule_id` is null.
- `SUBMODULE` permission: `submodule_id` is present.
- The referenced submodule belongs to the expected module.
- Permission codes remain globally unique and stable.

## Alternative: Permission Resource Without Target Type

Another option is to rename the current `permissions` table to a generic resource catalog:

```text
authorization_resources
  id
  parent_id nullable
  code
  name
  resource_type
  route
  sort_order
```

Then role permissions reference `authorization_resources`.

This handles an arbitrary hierarchy but is more abstract and may make Prisma relations, validation, and reporting harder to understand. It should be chosen only if deeper nesting is genuinely required.

## Important Design Question: Boolean Columns Versus Action Rows

The current join table uses action columns:

```text
can_view
can_create
can_update
can_delete
can_approve
can_export
```

This is simple and efficient when the action list is stable.

An alternative normalized model is:

```text
permission_actions
  id
  code
  name

company_role_permission_actions
  company_role_id
  permission_id
  action_id
```

Action rows are more extensible but require more joins and more complex override handling. We need ChatGPT to advise whether the current boolean-action model is sufficient for this ERP or whether action rows provide enough long-term value to justify the migration.

## Proposed Naming

If the preferred target model is accepted:

| Current | Proposed |
| --- | --- |
| `platform_modules` | Keep |
| No submodule table | Add `platform_submodules` |
| `permissions` | Keep, but make target explicit |
| `company_role_permissions` | Keep |
| `membership_permissions` | Keep |
| `permission.module_id` | Replace or supplement with explicit target relations |
| Frontend `permissionCode` | Keep as stable authorization code |
| Frontend `permissionName` | Keep as display name |
| Frontend `submodule.value` | Consider rename to `permissionCode` or `resourceCode` |

The join-table names can remain `company_role_permissions` and `membership_permissions` because they genuinely store permission assignments.

## Source Of Truth Concern

Currently, the frontend sidebar registry acts as the permission catalog source of truth. The backend creates or updates catalog rows when roles are saved.

Risks:

- A stale frontend can recreate old permission names or codes.
- New sidebar entries do not exist in the database until a role using them is saved or a migration seeds them.
- The backend cannot independently validate whether a submitted permission is a supported application permission.
- Other clients could submit arbitrary module and permission codes.

Recommended improvement:

- Move the canonical module/submodule/permission catalog to the backend.
- Seed or migrate the catalog explicitly.
- Expose a read-only permission catalog endpoint for the frontend User Role screen.
- Validate role submissions against existing active backend permissions.
- Keep the frontend sidebar registry mapped to the same stable codes, but do not let the frontend create permission catalog records.

## Proposed API Direction

Catalog endpoint:

```http
GET /api/v1/company/units/:unitId/roles/permission-catalog
```

Example response:

```json
{
  "modules": [
    {
      "code": "cash-disbursement",
      "name": "Cash Disbursement",
      "submodules": [
        {
          "code": "cash-disbursement-petty-cash-fund-replenishment",
          "name": "Petty Cash Fund Replenishment",
          "actions": [
            "view",
            "create",
            "update",
            "delete",
            "approve",
            "export"
          ]
        }
      ]
    }
  ]
}
```

Role write payload should preferably submit stable codes and actions only:

```json
{
  "name": "Cashier",
  "description": "Handles petty cash.",
  "permissions": [
    {
      "permissionCode": "cash-disbursement-petty-cash-fund-replenishment",
      "actions": ["view", "create", "update"]
    }
  ]
}
```

The backend should resolve names, module ownership, scope, and supported actions from its catalog rather than trusting submitted names.

## Migration Plan

### Phase 1: Stabilize Current Model

- Finish applying the Cash Disbursement permission catalog migration.
- Preserve all existing role and membership permission assignments.
- Keep canonical permission codes stable.
- Reject or normalize legacy permission codes.

### Phase 2: Introduce Submodule Catalog

- Add `platform_submodules`.
- Backfill submodules from current `permissions` rows.
- Add explicit permission target fields or relations.
- Keep old relations temporarily for compatibility.
- Add database constraints and indexes.

### Phase 3: Move Catalog Ownership To Backend

- Add a backend seed/migration for all modules, submodules, and permissions.
- Add the permission catalog endpoint.
- Update frontend User Role to load the backend catalog.
- Stop accepting module/permission display names from role write requests.
- Validate all submitted permission codes.

### Phase 4: Cleanup

- Remove compatibility fields and legacy DTO properties.
- Regenerate OpenAPI frontend types.
- Update access-control services and tests.
- Remove legacy permission-code normalization after all environments are migrated.

## Data Migration Requirements

The migration must preserve:

- Existing `company_role_permissions` action grants.
- Existing `membership_permissions` overrides, including nullable values.
- Existing role-to-user and role-to-branch assignments.
- Stable permission codes referenced by frontend navigation and backend guards.

It must handle:

- A legacy and target permission both existing.
- Duplicate role assignments when merging permissions.
- Conflicting membership override values.
- Inactive or orphaned permission rows.
- Rollout where frontend and backend versions briefly differ.

## Testing Plan

Database checks:

- List modules, submodules, permission targets, and active status.
- Compare assignment counts before and after migration.
- Confirm no role or membership assignment is lost.
- Confirm legacy permission codes are inactive or removed.

Backend checks:

- Create, update, read, and deactivate a branch role.
- Reject unsupported permission codes.
- Ensure action permissions imply view access where required.
- Verify old permission codes map safely during transition.
- Verify access-control resolution for role grants and membership overrides.

Frontend checks:

- User Role module order matches the sidebar.
- Permission labels match the backend catalog.
- Existing roles reopen with their current selections.
- Saving an existing role does not remove unrelated permissions.
- New modules and submodules appear without frontend-specific catalog edits.

## Questions For ChatGPT

Please review this design and answer:

1. Should `permissions` remain a general table targeting modules/submodules, or should it be renamed to `authorization_resources`?
2. Is a separate `platform_submodules` table worthwhile, or is a self-referencing resource hierarchy cleaner?
3. Should role actions remain boolean columns or move to normalized action rows?
4. What database constraints best enforce valid module/submodule permission targets in PostgreSQL and Prisma?
5. How should nullable membership overrides be merged when legacy permissions are consolidated?
6. Should the backend permission catalog be migration-driven, seed-driven, or both?
7. What rollout sequence minimizes risk while frontend and backend deployments may briefly be on different versions?
8. Are there naming improvements that preserve clarity without overengineering the schema?

## Requested Output From ChatGPT

Please provide:

1. Recommended final schema with table and column names.
2. Prisma model examples.
3. PostgreSQL constraint recommendations.
4. A phased zero-data-loss migration plan.
5. Recommended backend DTO and endpoint changes.
6. Recommended frontend integration changes.
7. Risks, tradeoffs, and tests that should be added.
