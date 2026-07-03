# Access Control Phase 5 Company Access Resolver

## Overview

Phase 5 extracts user/company/membership loading and access validation from `AccessControlService` into `CompanyAccessResolver`.

This phase is behavior-preserving. It does not change Prisma query shape, database schema, API response shape, frontend behavior, onboarding, provisioning, entitlement semantics, permission semantics, or sidebar behavior.

## What Moved

`CompanyAccessResolver` now owns:

- Active user loading from JWT subject.
- Inactive/missing user rejection.
- Selected company membership loading.
- Missing membership rejection.
- Membership status validation.
- Company active/status validation.
- Latest subscription availability validation.
- Existing provider activation fallback behavior.
- Returning a normalized access context:
  - `user`
  - `membership`

New files:

- `src/common/access/company-access/company-access-resolver.service.ts`
- `src/common/access/company-access/company-access-resolver.types.ts`
- `src/common/access/company-access/company-access-resolver.module.ts`
- `src/common/access/company-access/company-access-resolver.service.spec.ts`

## What Stayed In AccessControlService

`AccessControlService` now owns only orchestration and public guard helpers:

- Calls `CompanyAccessResolver`.
- Calls `EntitlementService`.
- Calls `PermissionService`.
- Calls `SidebarBuilder`.
- Assembles the final `AuthUser` payload.
- Exposes `hasPermission`.
- Exposes `assertCompanyContext`.

## Updated Architecture

```text
AccessControlService
  -> CompanyAccessResolver
       -> active user
       -> selected company membership
       -> company/subscription validation
  -> EntitlementService
       -> enabled module codes / ids / records
  -> PermissionService
       -> permissionCode:action[]
  -> SidebarBuilder
       -> userModules
  -> AuthUser payload
```

## Behavior Preservation

The resolver moved the existing Prisma include graph without redesigning it. The same records are still loaded:

- latest company subscription and plan systems
- active company units
- enabled company modules
- materialized user sidebar rows
- company role permissions
- branch role permissions
- membership permission overrides

The same `UnauthorizedException` messages are preserved for:

- inactive user
- missing company membership
- inactive membership
- inactive company
- suspended/failed company
- subscription access denial

## Remaining Technical Debt

- The membership include graph is still large.
- Query optimization has not been attempted.
- `CompanyAccessResolver` does not yet expose smaller query methods for specialized runtime flows.
- `company_modules` remains the entitlement compatibility source.
- Subscription access policy still depends on environment fallback configuration.

## Recommendation For Phase 6

Phase 6 should be a review/cleanup phase before any behavior-changing authorization work.

Recommended focus:

- Verify service boundaries are stable.
- Add higher-level integration tests around `/auth/me` if needed.
- Document the final orchestration contract.
- Only after that, consider changing `EntitlementService` internals to compute effective modules from subscription plans plus company exceptions.

Do not optimize queries or redesign entitlement semantics until the current extracted architecture is validated in staging.
