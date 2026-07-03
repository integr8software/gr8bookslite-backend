# Access Control Phase 1 Review

## Overview

Phase 1 is an internal refactor of `AccessControlService`. The goal is to prepare the service for the later modern SaaS authorization architecture without changing runtime behavior, database schema, API contracts, or frontend expectations.

`AccessControlService` remains the public orchestration point for building the authenticated access context used by login, `/auth/me`, company switching, permission checks, and sidebar rendering.

## Current Responsibilities Discovered

### Authentication Context

- Load the active user from the JWT subject.
- Reject missing or inactive users.
- Build the super admin auth context.
- Build the authenticated user context when no company is selected.
- Assemble the final `AuthUser` response payload.

### Active Company And Membership Resolution

- Resolve the user's membership for the selected company.
- Reject missing company membership.
- Load company, active units, latest subscription, enabled modules, materialized sidebar rows, roles, branch access, and permission overrides.

### Company And Subscription Availability

- Reject inactive memberships.
- Reject inactive companies.
- Reject suspended or failed companies.
- Apply subscription access denial rules.
- Preserve the existing provider activation fallback flag.

### Branch And Unit Access

- Include company units for company-wide/admin access.
- Include explicit `membership_unit_access` rows.
- Preserve branch-scoped role metadata in `userModules.byBranch`.

### Enabled Module Resolution

- Continue using `company.enabledModules` as the current runtime source.
- Expose enabled module codes in `AuthUser.enabledModules`.
- Use enabled module IDs when filtering sidebar items.

### Permission Resolution

- Aggregate company role permissions.
- Aggregate branch role permissions.
- Filter permissions by enabled modules.
- Apply membership permission overrides.
- Return permission strings in the existing `permissionCode:action` format.

### Sidebar And User Module Building

- Filter materialized sidebar link rows by active module, enabled module, and permission.
- Preserve non-link sidebar containers.
- Use subscription plan system sidebar templates when materialized rows are missing.
- Add fallback links for permitted enabled modules not represented by custom or system sidebar rows.
- Build branch-scoped sidebar payloads.

### Customization Handling

- Preserve existing materialized user sidebar rows.
- Fall back to system templates only when no customized rows exist for a scope.
- Avoid overwriting user customization in this service.

### Company Switching And Auth/Me Assembly

- Company switching and `/auth/me` rely on the same `resolveAuthUser` result shape.
- The refactor keeps public method signatures and response shape unchanged.

## Helper Methods Extracted

- `getActiveUser`
- `buildSuperAdminAuthUser`
- `buildUserWithoutCompanyContext`
- `buildCompanyAuthUser`
- `buildEmptyUserModules`
- `getEnabledModuleCodes`
- `getEffectiveCompanyRole`
- `isPermissionWithinEnabledModules`
- `getEnabledModuleIds`
- `getPermittedSidebarItems`
- `isSidebarItemPermitted`
- `getPermittedEnabledModules`
- `hasModulePermission`
- `getAccessibleBranchIds`
- `buildBranchModuleAccess`

The existing public methods remain unchanged:

- `resolveAuthUser`
- `hasPermission`
- `assertCompanyContext`

## Future EntitlementService Boundary

The future `EntitlementService` should own effective module calculation.

Current logic that should move later:

- Reading enabled modules from `company.enabledModules`.
- Deciding which module IDs are enabled for a company.
- Later resolving plan/module-system defaults plus company overrides.
- Hiding current `company_modules` compatibility from `AccessControlService`.

Do not extract this until the `company_modules` long-term model is finalized.

## Future PermissionService Boundary

The future `PermissionService` should own permission aggregation.

Current logic that should move later:

- Company role permission aggregation.
- Branch role permission aggregation.
- Permission override application.
- Filtering permissions by effective modules.
- Producing `permissionCode:action` keys.

This extraction is lower risk after effective modules become a clear input.

## Future SidebarBuilder Boundary

The future `SidebarBuilder` should own `userModules` construction.

Current logic that should move later:

- Materialized sidebar filtering.
- System sidebar template fallback.
- Missing enabled-module fallback items.
- Branch-scoped sidebar payload assembly.
- User customization preservation rules.

This should happen after entitlement and permission boundaries are stable.

## Risks Discovered

- `company.enabledModules` is still the runtime entitlement source. This is acceptable for Phase 1 but remains a long-term architectural risk.
- The membership Prisma include graph is large because it loads data for membership, subscription, entitlement, permission, and sidebar concerns in one query.
- Sidebar generation depends on effective modules, permissions, plan system templates, branch access, and materialized customization rows.
- Permission filtering still supports legacy permission shape through direct `module` lookup and old `submodule.module` fallback. Removing that compatibility would be risky.
- Subscription provider fallback is environment-driven and must remain preserved during later extraction.

## Suggested Phase 2 Extraction Order

1. **EntitlementService**
   - Keep current behavior first.
   - Return the same effective module codes and module records currently read from `company.enabledModules`.
   - Do not redesign `company_modules` in the first extraction.

2. **PermissionService**
   - Consume effective modules as input.
   - Return the same permission key format.
   - Preserve overrides and legacy module lookup behavior.

3. **SidebarBuilder**
   - Consume membership scope, effective modules, permissions, user sidebar rows, and system templates.
   - Preserve existing branch output and customization behavior.

4. **CompanyAccessResolver**
   - Move membership/company loading after downstream builders are smaller.
   - Keep Prisma include shape explicit and testable.

5. **Thin AccessControlService**
   - Keep orchestration and public API methods only.

## Phase 1 Decision

Phase 1 intentionally keeps all logic inside `AccessControlService`. This avoids speculative abstraction while making the next extraction phase smaller and easier to review.
