# Module System Classification and Sidebar Architecture

## Goal

Introduce a master-maintained system classification layer for modules.

The system classification layer answers:

```txt
Which modules belong to Accounting?
Which modules belong to Inventory?
Which modules belong to future systems?
How should each system's sidebar be organized by default?
```

Plan and packages should not own this classification. Plan and packages should only decide pricing and which systems are available for a plan.

## Architecture Rule

Keep these responsibilities separate:

```txt
Module catalog owns:
- Stable module identity
- Module name and display metadata
- Permission identity

System maintenance owns:
- System identity, such as ACCOUNTING or INVENTORY
- System-to-module assignment
- System-specific default/custom sidebar structure
- System display order and active status

Plan and packages owns:
- Pricing
- Billing cycle prices
- Usage rules
- Discount tiers
- Which systems are included in a plan

Frontend route map owns:
- Actual page URLs
- Route-to-component mapping
- Link href generation from module code
```

Do not reintroduce `modules.route` or route-derived classification.

---

## Target Data Model

Add a system classification model separate from modules and subscription plans.

```txt
module_systems
- id
- code
- name
- description
- iconKey
- sortOrder
- isActive
- createdAt
- updatedAt

module_system_modules
- id
- systemId
- moduleId
- sortOrder
- isActive
- createdAt
- updatedAt

subscription_plan_systems
- id
- subscriptionPlanId
- systemId
- isEnabled
- createdAt
- updatedAt
```

Each module can belong to multiple systems if the business allows shared modules. If the business wants exclusive membership later, add a unique constraint on `moduleId`.

Recommended constraints:

```txt
module_systems.code unique
module_system_modules(systemId, moduleId) unique
subscription_plan_systems(subscriptionPlanId, systemId) unique
```

---

## System Sidebar Model

Each system should have its own default/custom sidebar structure.

This should not be stored as frontend routes. Sidebar link items should reference module IDs and module codes only.

The system sidebar is a template. Company and user customized sidebars are snapshots/preferences derived from that template.
Updating a system default sidebar must not rewrite existing company or user customized sidebars. It should only affect new
companies, new sidebar materializations, reset-to-system-default flows, or explicit rematerialization actions.

This must preserve the current sidebar behavior:

- Companies can still customize their own sidebar after the default sidebar is materialized.
- Sidebar customization remains per user.
- Role users should receive the sidebar configuration prepared by the company's admin user, then still pass through the
  user's role/module permission filtering.
- System sidebar templates are only the starting point; they do not replace company admin sidebar configuration or
  user-specific sidebar preferences.

Recommended table:

```txt
module_system_sidebar
- id
- systemId
- parentId
- moduleId
- itemType        SECTION | CONTAINER | LINK
- key
- label
- description
- iconName
- sortOrder
- isVisible
- isSystemDefault
- createdAt
- updatedAt
```

Rules:

- `SECTION` and `CONTAINER` items cannot reference a module.
- `LINK` items must reference a module.
- `LINK` items should derive frontend href from `module.code` through the frontend route map.
- Sidebar validation should ensure every visible link belongs to a module assigned to the same system.
- A system can have a default sidebar even before any company/user customization exists.
- If no default sidebar is configured for a system, the materializer should generate an initial sidebar with no categorization.
- The generated fallback sidebar should be root-level module links sorted alphabetically by module name, then module code.

Optional future extension:

```txt
company_system_sidebar
- companyId
- systemId
- branchUnitId?
- userId?
- parentId
- moduleId
- itemType
- key
- label
- iconName
- sortOrder
- isVisible
- version
```

Use this only if companies need their own system sidebar templates beyond the existing user sidebar customization.

---

## System Maintenance Workflow

System classification should be managed in the master maintenance area.

User flow:

1. Go to `Master > System Maintenance`.
2. Create or edit a system.
3. Enter system identity metadata:
   - code
   - name
   - description
   - icon
   - sort order
   - active status
4. Select the modules included in the system.
5. Optionally configure the system's default initial sidebar.
6. Save the system.

Sidebar behavior:

- If the admin configures the default initial sidebar, new companies/users should start from that structure.
- If the admin does not configure a default initial sidebar, new companies/users should start from the generated fallback:
  no categorization, all included modules as root-level links, sorted alphabetically.
- Updating a system sidebar changes the system template only.
- Updating a system sidebar must not affect existing company customized sidebars.
- Company admins can customize the company sidebar after setup; role users inherit that admin-prepared sidebar as their
  baseline.
- Existing company customized sidebars should continue to render through access filtering, so modules removed from a system
  should not appear for users who no longer have access.

Plan and packages should not present module classification. It should only present systems for pricing and availability.

---

## Backend API Direction

Create a master maintenance API for systems.

Suggested endpoints:

```txt
GET    /master/module-systems
POST   /master/module-systems
GET    /master/module-systems/:id
PATCH  /master/module-systems/:id
PATCH  /master/module-systems/:id/status

PUT    /master/module-systems/:id/modules
GET    /master/module-systems/:id/sidebar
PUT    /master/module-systems/:id/sidebar
```

Recommended response shape:

```ts
{
  id: 1,
  code: "ACCOUNTING",
  name: "Accounting",
  description: "Accounting modules and workflows.",
  iconKey: "accounting",
  sortOrder: 10,
  isActive: true,
  modules: [
    {
      id: 5,
      code: "COA",
      name: "Chart of Accounts",
      iconKey: "scale",
      sortOrder: 10,
      isActive: true
    }
  ],
  sidebar: [
    {
      id: 100,
      key: "financial-maintenance",
      label: "Financial Maintenance",
      itemType: "SECTION",
      iconName: "accounting",
      children: [
        {
          id: 101,
          key: "financial-maintenance-charts-of-accounts",
          label: "Chart of Accounts",
          itemType: "LINK",
          moduleId: 5,
          moduleCode: "COA",
          children: []
        }
      ]
    }
  ]
}
```

The backend should not return `href` or `route` for module links.

`PUT /master/module-systems/:id/sidebar` may save an explicit sidebar tree. If the sidebar is empty or omitted, treat the
system as having no configured default sidebar and use the alphabetical uncategorized fallback during materialization.

---

## Plan and Packages Direction

Plan and packages should select systems, not classify modules.

Replace plan module inputs like:

```ts
moduleKeys: ["COA", "BM", "TM"]
```

with:

```ts
systemCodes: ["ACCOUNTING", "INVENTORY"]
```

The plan response can still include derived modules for display if useful:

```ts
{
  code: "ACCOUNTING_INVENTORY",
  name: "Accounting & Inventory",
  systemCodes: ["ACCOUNTING", "INVENTORY"],
  systems: [
    {
      code: "ACCOUNTING",
      name: "Accounting",
      moduleCount: 42
    },
    {
      code: "INVENTORY",
      name: "Inventory",
      moduleCount: 30
    }
  ]
}
```

Rules:

- Plan creation and editing should validate selected system codes.
- A plan can include one or more active systems.
- Plan pricing should not depend on hard-coded module lists.
- Company module enablement should be derived from the selected plan systems when a subscription is activated or changed.
- When a plan selects multiple systems, the company should still receive one merged sidebar baseline, not one sidebar per system.

Multiple system sidebar merge rules:

- Load each selected system sidebar template in system sort order.
- Merge templates into one company/admin sidebar baseline.
- If two sidebar categories have the same normalized key or label, merge their children into the same category.
- If the same module appears in more than one selected system, de-duplicate by `moduleId`.
- The first existing placement of a module wins; do not create duplicate links.
- Different categories should be appended in system sort order.
- If the company already has a customized sidebar, append only missing module links from newly added systems.
- Never overwrite existing company/admin or per-user sidebar customization during plan changes.

Example:

```txt
Plan: Accounting + Inventory

Selected systems:
- ACCOUNTING
- INVENTORY

Result:
- Enable the union of Accounting and Inventory modules.
- Merge the Accounting and Inventory sidebar templates into one sidebar.
- Shared categories such as Maintenance can be merged.
- Shared modules appear once.
```

If the business wants a specially curated combined layout, create a combined system in System Maintenance:

```txt
System: ACCOUNTING_TRADING

This system can include all accounting/trading modules and have its own sidebar template.
If a plan selects only ACCOUNTING_TRADING, use that single configured template.
If a plan selects ACCOUNTING_TRADING plus other systems, still apply the same merge and module de-duplication rules.
```

---

## Access Resolution Direction

Current access flow should evolve from:

```txt
subscription plan -> plan modules -> company modules -> permissions/sidebar
```

to:

```txt
subscription plan -> plan systems -> system modules -> company modules -> permissions/sidebar
```

When a company subscribes to a plan:

1. Load enabled systems for the plan.
2. Load active modules assigned to those systems.
3. Enable those modules for the company.
4. Materialize or merge sidebar items from the relevant system sidebars.
5. Apply user/role permission filtering as usual.

If a module belongs to multiple systems, de-duplicate by module ID.
If categories from multiple system templates are intentionally similar, merge them by normalized key or label.
If a company already customized its sidebar, keep its existing layout and only append newly available missing modules.

---

## Frontend Direction

Add a master maintenance page for module systems.

Suggested route:

```txt
/master/module-systems
```

Suggested UI:

- System list with code, name, module count, status, and actions.
- System form for identity metadata.
- Module assignment panel using available module records.
- Sidebar builder panel for system-specific default sidebar.

Plan and packages UI should change from "All modules" to "Available systems" or "Included systems".

The plan-and-packages screen should show:

- Selected systems
- Derived module count
- Pricing
- Billing rules
- Usage and discount rules

It should not be the place where modules are assigned to Accounting or Inventory.

---

## Seed Direction

`moduleCatalog.ts` should stay focused on module identity only.

Good:

```ts
{
  code: "COA",
  name: "Chart of Accounts",
  icon: "scale",
  type: ["maintenance"],
}
```

Avoid:

```ts
export const InventoryModuleCodes = [...]
export const AccountingModuleCodes = [...]
```

Create separate system seed files:

```txt
prisma/seeds/moduleSystemCatalog.ts
prisma/seeds/seedModuleSystems.ts
```

Example:

```ts
export const ModuleSystemCatalog = [
  {
    code: "ACCOUNTING",
    name: "Accounting",
    iconKey: "accounting",
    sortOrder: 10,
    moduleCodes: ["DO", "COA", "BM", "TM"],
  },
  {
    code: "INVENTORY",
    name: "Inventory",
    iconKey: "inventory",
    sortOrder: 20,
    moduleCodes: ["I", "WM", "RR", "GR"],
  },
];
```

This is acceptable as seed data for default system setup because it belongs to system maintenance, not the module catalog.

Long term, the master maintenance UI should be able to edit this data in the database.

---

## Phase-by-Phase Implementation

## Phase 1: Backend Schema

Tasks:

1. Add `ModuleSystem`.
2. Add `ModuleSystemModule`.
3. Add `SubscriptionPlanSystem`.
4. Add `ModuleSystemSidebarItem`.
5. Generate and apply migration.
6. Regenerate Prisma Client.

Acceptance criteria:

- Prisma schema validates.
- Migration applies locally.
- Existing module catalog and permissions still verify.

## Phase 2: System Seeds

Tasks:

1. Create `moduleSystemCatalog.ts`.
2. Create `seedModuleSystems.ts`.
3. Seed default systems and module assignments.
4. Seed default system sidebar structures.
5. Update main `seed.ts` order so modules seed before systems and systems seed before plans.

Acceptance criteria:

- Default Accounting and Inventory systems exist.
- Assigned modules exist and are active.
- No module URLs or frontend routes are used.

## Phase 3: Master System API

Tasks:

1. Create backend module for master module systems.
2. Add list/create/update/status endpoints.
3. Add module assignment endpoint.
4. Add sidebar read/save endpoints.
5. Add validation for duplicate system codes, duplicate module assignment, and invalid sidebar trees.
6. Add fallback sidebar generation for systems without configured sidebar trees.

Acceptance criteria:

- Admin can manage systems through API.
- Sidebar tree is persisted by module IDs and module codes only.
- Invalid module/system combinations are rejected.
- Empty system sidebars resolve to alphabetical uncategorized module links during materialization.

## Phase 4: Plan and Packages API

Tasks:

1. Replace `moduleKeys` input with `systemCodes`.
2. Store plan-system links in `subscription_plan_systems`.
3. Return selected systems and derived module counts.
4. Keep module lists as derived read-only data if needed for display.
5. Update subscription/company module enablement logic to derive modules from systems.

Acceptance criteria:

- Plan pricing no longer depends on hard-coded module code lists.
- Plan creation requires at least one active system.
- Existing plan responses remain understandable to frontend.

## Phase 5: Frontend System Maintenance

Tasks:

1. Add `/master/module-systems` route.
2. Add system list page.
3. Add system form.
4. Add module assignment UI.
5. Add optional initial system sidebar customization UI.
6. Reuse the existing sidebar tree editing patterns where practical.

Acceptance criteria:

- Admin can classify modules into systems.
- Admin can customize each system's default sidebar template.
- Admin can leave the initial sidebar unconfigured and rely on the alphabetical uncategorized fallback.
- No frontend route URLs are stored in system/sidebar API payloads.

## Phase 6: Frontend Plan and Packages

Tasks:

1. Replace module picker with system picker.
2. Show derived module counts per selected system.
3. Preserve pricing, usage rules, and discount tier flows.
4. Update API types and mappers from `moduleKeys` to `systemCodes`.

Acceptance criteria:

- Plan and packages presents systems for pricing.
- Plan and packages does not classify modules.
- Existing plan list/detail/create flows still work.

## Phase 7: Access and Sidebar Materialization

Tasks:

1. Update subscription activation to enable modules from selected systems.
2. Update default sidebar materialization to use system sidebars.
3. De-duplicate modules across systems.
4. Keep user sidebar customization as the user-specific layer.
5. Do not overwrite existing company/user sidebar customizations when system sidebar templates change.

Acceptance criteria:

- User access reflects plan systems.
- Sidebar structure starts from included system sidebars, or from the alphabetical uncategorized fallback if no template exists.
- User customization still works after system sidebar changes.
- Existing company/user customized sidebars are not rewritten by system template updates.

---

## Important Rules

Do not:

- Put Accounting or Inventory membership in `moduleCatalog.ts`.
- Infer systems from frontend routes.
- Infer systems from module code prefixes.
- Store frontend hrefs in backend sidebar tables.
- Let plan and packages become the owner of module classification.

Do:

- Use module codes as stable identifiers.
- Use system maintenance as the classification owner.
- Use plan and packages as pricing and plan availability owner.
- Use frontend route map for URLs.
- Keep sidebar tree records module-code based, not route based.
- Treat system sidebars as default templates.
- Treat company/user sidebars as customized snapshots/preferences.
- Use an alphabetical uncategorized fallback when a system has no configured default sidebar.
- Merge selected system sidebar templates into one company sidebar baseline.
- Support combined systems, such as `ACCOUNTING_TRADING`, for curated all-in-one layouts.

---

## Suggested Search Targets

Before implementation, search:

```txt
AccountingModuleCodes
InventoryModuleCodes
moduleKeys
SubscriptionPlanModule
subscriptionPlan.modules
company.enabledModules
materializeDefaultUserSidebar
platformModuleSidebar
MasterPlanAndPackageFeatureOptions
MasterPlanAndPackageFormPage
```

---

## Final Expected Result

After this refactor:

```txt
Module catalog says:
COA is Chart of Accounts.

System maintenance says:
COA belongs to Accounting.
Accounting sidebar places COA under Financial Maintenance.

Plan and packages says:
Accounting system is available on the Accounting plan for PHP 399/month.

Frontend says:
COA opens /maintenance/charts-of-accounts.
```

This keeps module identity, system classification, pricing, sidebar organization, and frontend routing in their own proper places.
