# Access Control Phase 3 Permission Service

## Overview

Phase 3 extracts effective permission computation from `AccessControlService` into `PermissionService`.

This phase is behavior-preserving. It does not change database schema, Prisma loading, API response shape, frontend behavior, onboarding, provisioning, entitlement semantics, or sidebar behavior.

## What Moved

`PermissionService` now owns:

- Company role permission aggregation.
- Branch role permission aggregation.
- Membership permission override application.
- Permission filtering by enabled module codes.
- Legacy direct module and `submodule.module` permission lookup compatibility.
- Permission serialization to the existing `permissionCode:action` format.

New files:

- `src/common/access/permissions/permission.service.ts`
- `src/common/access/permissions/permission.types.ts`
- `src/common/access/permissions/permission.module.ts`
- `src/common/access/permissions/permission.service.spec.ts`

## What Stayed In AccessControlService

`AccessControlService` still owns orchestration:

- Active user loading.
- Membership and company access loading.
- Company and subscription availability checks.
- Calling `EntitlementService`.
- Calling `PermissionService`.
- Existing sidebar and user module building.
- Final `AuthUser` response assembly.

## Architecture After Phase 3

```text
AccessControlService
  -> EntitlementService
       -> enabled module codes / ids / records
  -> PermissionService
       -> permissionCode:action[]
  -> existing AccessControlService sidebar logic
       -> userModules
  -> AuthUser payload
```

## Behavior Preservation

The source data is unchanged:

- Permissions still come from the already-loaded membership graph.
- Enabled module filtering still uses the same enabled module code list from `EntitlementService`.
- Overrides are still applied after role permissions.
- Permission output is still an array of strings using `permissionCode:action`.

## Technical Debt Remaining

- `AccessControlService` still builds sidebar/userModules.
- `AccessControlService` still owns the large Prisma membership include graph.
- `PermissionService` currently receives already-loaded records and does not own database access.
- `company_modules` remains the entitlement compatibility source through `EntitlementService`.
- Sidebar logic still depends on entitlement and permission outputs inside `AccessControlService`.

## Phase 4 Recommendation

Extract `SidebarBuilder` next, still behavior-preserving.

Suggested boundary:

- Input: membership scope, enabled module records, permissions, materialized sidebar rows, and system sidebar templates.
- Output: the existing `userModules` payload.
- Preserve branch output.
- Preserve customization behavior.
- Preserve system template fallback.
- Preserve missing-module fallback links.

Do not redesign sidebar persistence or customization during Phase 4.
