# Module Route Architecture Refactor

## Goal

Refactor module navigation so the database no longer owns frontend page URLs.

Currently, `modules.route` is used as frontend sidebar/navigation metadata. This works, but it tightly couples database seed/migration data to frontend route structure. If a frontend path changes, the database also needs to change.

The target architecture is:

```txt
Database owns:
- Module identity
- Module display metadata
- Access control
- Plan/package access
- Sidebar grouping/order/visibility

Frontend owns:
- Actual page routes
- Route-to-component mapping
- Sidebar href generation
- Frontend navigation behavior
```

## Current Understanding

Based on the current codebase:

- `modules.route` is not used as a backend proxy route.
- It is used as a frontend navigation href.
- Backend returns module/sidebar records containing `route` or `href`.
- Frontend consumes those values to build sidebar links.

Examples:

```txt
Module code: COA
Current DB route: /maintenance/charts-of-accounts
Meaning today: frontend href
```

This should become:

```txt
Module code: COA
Frontend route map: COA -> /maintenance/charts-of-accounts
```

## Architecture Rule

Do not treat database module records as frontend route source of truth.

Use this separation:

```txt
modules.code = stable cross-layer identifier
frontend MODULE_ROUTE_MAP = route owner
backend access/sidebar API = permission and metadata source
```

## Target Data Shape

Backend should prefer returning module identity and metadata:

```ts
{
  code: "BANK_MASTERFILE",
  name: "Bank Masterfile",
  iconKey: "bank",
  groupCode: "FINANCIAL_MANAGEMENT",
  sortOrder: 10,
  permissions: ["view", "create", "edit", "delete"]
}
```

Frontend should derive href:

```ts
const href = MODULE_ROUTE_MAP[module.code] ?? MODULE_ROUTE_FALLBACK;
```

## Recommended Frontend Route Map

Create a frontend-owned route map, for example:

```ts
// app/src/data/shared/modules/ModuleRouteMap.ts

export const MODULE_ROUTE_FALLBACK = "/not-found";

export const MODULE_ROUTE_MAP = {
  CHART_OF_ACCOUNTS: "/maintenance/chart-of-accounts",
  TERMS: "/maintenance/financial-management/terms",
  BANK_MASTERFILE: "/maintenance/financial-management/bank-masterfile",
  APPROVAL_MANAGEMENT: "/system-administration/approval-management",
  TRANSACTION_NUMBER_SEQUENCES: "/system-administration/transaction-number-sequences",
  SIDEBAR_CUSTOMIZATION: "/system-administration/sidebar-customization",
} as const;

export type ModuleCode = keyof typeof MODULE_ROUTE_MAP;

export function getModuleRoute(moduleCode: string): string {
  return MODULE_ROUTE_MAP[moduleCode as ModuleCode] ?? MODULE_ROUTE_FALLBACK;
}
```

Use this map anywhere the frontend builds sidebar/navigation links.

## Recommended Database Direction

Long-term database model should focus on access and organization:

```txt
modules
- id
- code
- name
- description
- iconKey
- categoryCode/groupCode
- sortOrder
- status
- isSystem

module_permissions
- id
- moduleId
- action

plan_modules
- id
- planId
- moduleId

company_modules
- id
- companyId
- moduleId
- enabled

user_sidebar_items
- id
- userId/companyId
- moduleId
- sortOrder
- isPinned
- isVisible
```

`modules.route` should be deprecated first, not immediately removed.

---

# Phase-by-Phase Implementation

## Phase 1: Add Frontend Route Map Without Removing DB Route

### Objective

Introduce frontend-owned route mapping while keeping existing backend payloads compatible.

### Tasks

1. Create a frontend module route map file.
2. Add a helper such as `getModuleRoute(moduleCode: string)`.
3. Keep existing `route`/`href` fields from backend for now.
4. Do not change the database schema yet.
5. Do not remove `modules.route` from seeds yet.

### Suggested Files

```txt
gr8bookslite-frontend/app/src/data/shared/modules/ModuleRouteMap.ts
```

Optional if current sidebar code is under this area:

```txt
gr8bookslite-frontend/app/src/data/shared/main-layout/sidebar/UserModuleNavigationAdapter.ts
```

### Acceptance Criteria

- Frontend has a single centralized `MODULE_ROUTE_MAP`.
- No sidebar component hardcodes module hrefs inline.
- Existing sidebar still works.
- No backend/database breaking changes.

---

## Phase 2: Update Sidebar Adapter to Prefer Module Code

### Objective

Make frontend sidebar navigation derive href from `module.code`, not from DB `route`.

### Tasks

1. Locate current sidebar adapter/navigation builder.
2. Replace direct usage of backend `route`/`href` with `getModuleRoute(module.code)`.
3. Keep backend `route` as fallback only during migration.
4. Log or safely handle missing module route mappings.

### Suggested Logic

```ts
const href = getModuleRoute(module.code);

// Temporary migration fallback only if needed:
const href = getModuleRoute(module.code) ?? module.route ?? module.href ?? MODULE_ROUTE_FALLBACK;
```

Better final logic after map coverage is complete:

```ts
const href = getModuleRoute(module.code);
```

### Acceptance Criteria

- Sidebar links are generated from frontend route map.
- Changing a frontend path only requires changing frontend code.
- Backend route values are no longer the primary source of href.
- Existing user sidebar customization still renders correctly.

---

## Phase 3: Update Backend DTO/API Naming

### Objective

Clarify that backend does not own frontend routes.

### Tasks

1. Review backend DTOs that expose `route` or `href`.
2. Prefer returning `code`, `name`, `iconKey`, `groupCode`, `sortOrder`, `permissions`.
3. Keep `route` as a legacy field only if needed for backward compatibility.
4. Add comments or TODOs marking `route` as deprecated.

### Recommended API Shape

```ts
{
  code: string;
  name: string;
  iconKey?: string;
  groupCode?: string;
  sortOrder?: number;
  permissions?: string[];
  legacyRoute?: string; // optional temporary field only
}
```

Avoid naming backend fields `href` unless the backend truly owns the navigation URL.

### Acceptance Criteria

- Backend API clearly returns module metadata, not frontend route ownership.
- Frontend does not require backend `route` to navigate.
- Existing API consumers are not broken.

---

## Phase 4: Update Seeds and Module Catalog

### Objective

Stop treating route as required seed data.

### Tasks

1. Review `seedModules.ts` or equivalent module seed files.
2. Make `route` optional or legacy-only.
3. Ensure every module has a stable `code`.
4. Ensure frontend route map has an entry for every routable module code.
5. Add validation to detect missing frontend route mappings where possible.

### Seed Rule

Good:

```ts
{
  code: "BANK_MASTERFILE",
  name: "Bank Masterfile",
  iconKey: "bank",
  groupCode: "FINANCIAL_MANAGEMENT",
  sortOrder: 10,
}
```

Avoid long-term:

```ts
{
  code: "BANK_MASTERFILE",
  route: "/maintenance/financial-management/bank-masterfile",
}
```

### Acceptance Criteria

- Seed data no longer depends on frontend path structure.
- Module code is the stable contract between backend and frontend.
- All active modules have frontend route map coverage.

---

## Phase 5: Add Tests

### Objective

Protect the new architecture from regressions.

### Frontend Tests

Add tests for:

1. `getModuleRoute()` returns the correct path for known module codes.
2. Unknown module codes return fallback route.
3. Sidebar adapter uses module code mapping instead of backend route.
4. Backend route changes do not affect generated frontend href.

Example test cases:

```ts
expect(getModuleRoute("BANK_MASTERFILE")).toBe(
  "/maintenance/financial-management/bank-masterfile",
);

expect(getModuleRoute("UNKNOWN_MODULE")).toBe("/not-found");
```

### Backend Tests

Add or update tests for:

1. Access-control/sidebar response includes stable module code.
2. Route field is optional or legacy-only.
3. Sidebar customization still returns module metadata correctly.
4. Permission filtering still works after route ownership changes.

### Acceptance Criteria

- Unit tests pass.
- Sidebar route behavior is covered.
- Backend access-control behavior is unchanged.
- No regression in sidebar customization.

---

## Phase 6: Deprecate `modules.route`

### Objective

Prepare for eventual removal without breaking existing environments.

### Tasks

1. Add code comments marking `modules.route` as deprecated.
2. Stop writing new business logic that depends on `modules.route`.
3. Stop requiring `route` in module create/update/seed logic.
4. Keep the DB column temporarily for old data compatibility.
5. Optionally rename API usage to `legacyRoute` if still exposed.

### Acceptance Criteria

- No new frontend logic reads `modules.route` as source of truth.
- Backend can operate even if `modules.route` is null.
- Existing seeded data remains compatible.

---

## Phase 7: Optional Cleanup Migration

### Objective

Remove `modules.route` only after all code no longer depends on it.

### Tasks

1. Search the entire repo for usage of `.route`, `module.route`, `modules.route`, and `href` coming from module records.
2. Confirm no active runtime code depends on DB route.
3. Create a migration to drop `modules.route` only when safe.
4. Update Prisma schema.
5. Update seeds.
6. Run full backend and frontend checks.

### Acceptance Criteria

- `modules.route` is removed from schema only after zero runtime dependency.
- Module navigation still works entirely from frontend route map.
- Access control and sidebar customization still work.

---

# Important Rules for Codex

## Do Not Do This

Do not make backend proxy routes based on `modules.route`.

Do not use database routes as source of truth for frontend navigation.

Do not immediately drop `modules.route` without migration coverage.

Do not break existing sidebar customization payloads.

Do not hardcode routes directly inside sidebar React components.

## Do This Instead

Use module code as the stable backend/frontend contract.

Use a centralized frontend route map.

Keep backend focused on permissions, module metadata, plan access, and sidebar ordering.

Keep route migration backward-compatible.

Add tests before removing legacy fields.

---

# Suggested Search Targets

Use these searches before implementation:

```txt
modules.route
module.route
availableModules
userModules
href
buildSidebar
buildUserModules
UserModuleNavigationAdapter
UserSidebarApi
seedModules
AccessControlService
UserSidebarService
```

---

# Final Expected Result

After the refactor:

```txt
Backend says:
User can access BANK_MASTERFILE.

Frontend says:
BANK_MASTERFILE opens /maintenance/financial-management/bank-masterfile.
```

This keeps backend authorization dynamic while keeping frontend routing maintainable and code-owned.
