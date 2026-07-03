# Access Control Phase 6 Stabilization Review

## Overview

Phase 6 validates the extracted access architecture before changing entitlement behavior. This phase does not change business rules, database schema, API response shape, frontend behavior, onboarding, provisioning, permission semantics, entitlement semantics, or sidebar behavior.

The current architecture is:

```text
AccessControlService
  -> CompanyAccessResolver
  -> EntitlementService
  -> PermissionService
  -> SidebarBuilder
  -> AuthUser payload
```

## Final Orchestration Contract

`AccessControlService.resolveAuthUser(payload)` is the orchestration boundary used by JWT auth and therefore by `/auth/me`.

The contract is:

1. Resolve active user and optional company membership through `CompanyAccessResolver`.
2. Return super admin access immediately when applicable.
3. Return standard user without company access when no company membership context exists.
4. Resolve enabled modules through `EntitlementService`.
5. Resolve permissions through `PermissionService`.
6. Resolve `userModules` through `SidebarBuilder`.
7. Assemble the existing `AuthUser` response shape.

## Service Boundaries

### CompanyAccessResolver

Owns:

- active user loading
- selected company membership loading
- membership/company/subscription validation
- subscription provider fallback behavior
- exact unauthorized exception messages

### EntitlementService

Owns:

- enabled module code resolution
- enabled module ID resolution
- module permission visibility checks
- current `company_modules` compatibility behavior

### PermissionService

Owns:

- company role permission aggregation
- branch role permission aggregation
- membership permission override application
- enabled-module permission filtering
- `permissionCode:action` output formatting

### SidebarBuilder

Owns:

- materialized sidebar filtering
- system sidebar template fallback
- missing enabled-module fallback links
- branch-scoped sidebar payload generation
- recursive sidebar tree building

### AccessControlService

Owns:

- public guard helpers
- thin orchestration
- final `AuthUser` response assembly

## What Must Not Move Yet

Do not move or redesign yet:

- `company_modules` semantics
- subscription-plan-derived effective entitlement behavior
- sidebar preference persistence
- Prisma query optimization
- new cache layers
- new APIs
- frontend sidebar contracts

## Coverage Added

Phase 6 adds higher-level coverage for:

- active company user resolving non-empty `enabledModules`
- active company user resolving non-empty `userModules`
- fresh onboarding-style company using system sidebar template fallback
- inactive company rejection message

Existing extracted-service coverage already protects:

- missing company membership
- inactive membership
- suspended/unavailable company
- subscription unavailable
- permission aggregation and overrides
- entitlement filtering
- sidebar tree/fallback behavior

## Remaining Risks

- `company_modules` can still contain legacy over-granted rows from older provision behavior.
- The large Prisma include graph is behavior-preserved but not optimized.
- The final entitlement redesign has not started.
- There is no HTTP-level `/auth/me` e2e test yet; current coverage exercises the service boundary used by the JWT guard and auth profile path.

## Readiness Checklist Before Entitlement Changes

Before changing `EntitlementService` internals:

- Confirm staging login and `/auth/me` behavior with real accounts.
- Confirm newly onboarded companies receive non-empty `enabledModules` and `userModules`.
- Confirm legacy companies still resolve access.
- Confirm shared-dev and staging provisioning do not over-grant new module rows.
- Decide the compatibility policy for existing `company_modules`.
- Add migration/repair strategy only after the target entitlement semantics are approved.

## Phase 7 Recommendation

Phase 7 should be an entitlement-design implementation phase only if the team is ready to change behavior.

Recommended next direction:

```text
effectiveModules =
  active subscription plan/module-system modules
  + company enabled exceptions
  - company disabled exceptions
```

The first Phase 7 step should still preserve compatibility by keeping `company_modules` as the fallback/override source while adding explicit tests for plan-derived effective modules.
