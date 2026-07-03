# Access Control Phase 4 Sidebar Builder

## Overview

Phase 4 extracts sidebar generation from `AccessControlService` into `SidebarBuilder`.

This phase is behavior-preserving. It does not change database schema, Prisma loading, API response shape, frontend behavior, onboarding, provisioning, entitlement semantics, permission semantics, or sidebar persistence.

## Responsibilities Moved

`SidebarBuilder` now owns:

- Filtering materialized sidebar rows by enabled modules.
- Filtering sidebar links by effective permissions.
- Admin module visibility behavior.
- Branch sidebar payload assembly.
- System sidebar template fallback.
- Missing enabled-module fallback links.
- Recursive user sidebar tree construction.
- Recursive system sidebar template tree construction.
- Empty section/container pruning.
- `userModules.items` and `userModules.byBranch` output generation.

New files:

- `src/common/access/sidebar/sidebar-builder.service.ts`
- `src/common/access/sidebar/sidebar-builder.types.ts`
- `src/common/access/sidebar/sidebar-builder.module.ts`
- `src/common/access/sidebar/sidebar-builder.service.spec.ts`

## Responsibilities Remaining In AccessControlService

`AccessControlService` now remains the orchestration layer for:

- Active user loading.
- Membership/company access loading.
- Company and subscription availability checks.
- Calling `EntitlementService`.
- Calling `PermissionService`.
- Calling `SidebarBuilder`.
- Final `AuthUser` payload assembly.
- Public guard helpers:
  - `hasPermission`
  - `assertCompanyContext`

## Updated Architecture

```text
AccessControlService
  -> load user and membership context
  -> validate company/subscription state
  -> EntitlementService
       -> enabled module codes / ids / module records
  -> PermissionService
       -> permissionCode:action[]
  -> SidebarBuilder
       -> userModules
  -> AuthUser payload
```

`SidebarBuilder` flow:

```text
membership + permissions
  -> filter materialized sidebar rows
  -> filter enabled modules by permissions
  -> build branch scopes
  -> prefer customized rows when present
  -> otherwise use system sidebar templates
  -> append missing fallback module links
  -> return userModules
```

## Behavior Preservation

The extracted builder uses the same inputs previously used by `AccessControlService`:

- membership role and access scope
- branch/unit access
- company enabled modules
- materialized user sidebar rows
- latest subscription plan system sidebar templates
- computed permission strings

The output remains the existing `userModules` object:

- `items`
- `byBranch`

## Technical Debt Remaining

- `AccessControlService` still owns the large Prisma membership include graph.
- `SidebarBuilder` receives already-loaded records and does not own database access.
- `company_modules` remains the entitlement compatibility source.
- User sidebar persistence/customization rules are not redesigned.
- There is still no separate company access resolver.

## Recommendation For Phase 5

Extract a behavior-preserving company/membership access resolver next.

Suggested boundary:

- Load active user.
- Load selected company membership and required include graph.
- Validate membership/company/subscription availability.
- Return a normalized runtime access context for `AccessControlService`.

Do not optimize queries or redesign data loading during Phase 5. Keep it as an extraction first.
