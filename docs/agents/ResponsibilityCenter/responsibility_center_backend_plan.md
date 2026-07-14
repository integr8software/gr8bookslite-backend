# Responsibility Center Backend Plan

## Purpose

Responsibility Center is currently a frontend-backed maintenance module. The backend implementation should make it a company-scoped module for maintaining organizational accountability dimensions used by transactions and reports.

The module must follow `docs/agents/ARCHITECTURE_MODULARITY_GUIDE.md`:

- Keep backend code in the maintenance domain.
- Keep controllers thin.
- Keep request validation in DTOs.
- Keep business rules in services.
- Use mappers for response shapes.
- Keep company-owned default records in company bootstrap, not a standalone manual seeder.
- Remove frontend mock data once the API is wired.

## Current Frontend Behavior

Current frontend route:

```text
gr8bookslite-frontend/app/(modules)/maintenance/responsibility-center/page.tsx
```

Current frontend source:

```text
gr8bookslite-frontend/app/src/constants/modules/maintenance/financial-management/responsibility-center/ResponsibilityCenterConstants.ts
gr8bookslite-frontend/app/src/data/modules/maintenance/financial-management/responsibility-center/ResponsibilityCenterData.ts
gr8bookslite-frontend/app/src/hooks/modules/maintenance/responsibility-center/
gr8bookslite-frontend/app/src/types/modules/maintenance/responsibility-center/ResponsibilityCenterTypes.ts
gr8bookslite-frontend/app/src/ui/modules/maintenance/responsibility-center/
```

Current behavior:

1. List page loads `MockResponsibilityCenters`.
2. Tree view is the default view.
3. List view and tree view share table columns.
4. Tree view hides `Parent Center`.
5. Add/edit/view happens in a drawer.
6. Status updates are confirmed with `AppDialog`.
7. Statistics are computed in frontend state.

Current frontend fields:

| Field | Meaning |
|---|---|
| `code` | Short responsibility center code, normalized uppercase |
| `name` | Responsibility center display name |
| `category` | Type such as Department, Branch, Project, Business Unit, Warehouse |
| `financialType` | Cost Center, Profit Center, Revenue Center, Investment Center |
| `manager` | Responsible person or role |
| `parentId` | Optional parent center for hierarchy |
| `status` | Active or Inactive |
| `description` | Notes for reporting and transaction usage |

## Current Default Mock Data

The current frontend mock data should become company-owned defaults for new companies.

Recommended defaults:

| Code | Name | Category | Financial Type | Parent |
|---|---|---|---|---|
| `CORP` | Corporate Office | Corporate | Investment Center | none |
| `FIN` | Finance and Administration | Department | Cost Center | Corporate Office |
| `OPS` | Operations | Division | Cost Center | Corporate Office |
| `SALES` | Sales and Customer Growth | Department | Profit Center | Corporate Office |
| `MAIN-BR` | Main Branch | Branch | Profit Center | Corporate Office |
| `MAIN-WHSE` | Main Warehouse | Warehouse | Cost Center | Operations |
| `PROC` | Procurement | Department | Cost Center | Operations |
| `ONLINE` | Online Sales | Business Unit | Profit Center | Sales and Customer Growth |
| `FIELD-SALES` | Field Sales | Sales Territory | Revenue Center | Sales and Customer Growth |
| `IMPL-PROJ` | Implementation Projects | Project | Cost Center | Operations |
| `HR` | Human Resources | Department | Cost Center | Finance and Administration |
| `IT` | Information Technology | Department | Cost Center | Finance and Administration |

Default records should seed as active. Seed should be idempotent and company-scoped.

## Backend Target Module

Recommended backend location:

```text
gr8bookslite-backend/src/modules/maintenance/responsibility-center/
```

Recommended files:

```text
src/modules/maintenance/responsibility-center/
  responsibility-center.module.ts
  responsibility-center.controller.ts
  responsibility-center.service.ts
  dto/
    create-responsibility-center.dto.ts
    get-responsibility-center-list-query.dto.ts
    update-responsibility-center.dto.ts
    update-responsibility-center-status.dto.ts
  mappers/
    responsibility-center.mapper.ts
  seed/
    responsibility-center.seed.ts
  types/
    responsibility-center-with-relations.type.ts
  utils/
    responsibility-center-code.util.ts
```

Register the module in:

```text
gr8bookslite-backend/src/app.module.ts
```

## API Endpoints

Recommended route base:

```text
/api/v1/maintenance/financial-management/responsibility-centers
```

Recommended operations:

| Operation | Method/path | Notes |
|---|---|---|
| List | `GET /maintenance/financial-management/responsibility-centers` | Company-scoped, supports query/status/category/financialType filters |
| Tree | `GET /maintenance/financial-management/responsibility-centers/tree` | Optional if frontend prefers server-shaped hierarchy |
| Get one | `GET /maintenance/financial-management/responsibility-centers/:id` | Company-scoped |
| Create | `POST /maintenance/financial-management/responsibility-centers` | Validates hierarchy and duplicate code/name |
| Update | `PATCH /maintenance/financial-management/responsibility-centers/:id` | Validates parent changes and duplicate code/name |
| Status | `PATCH /maintenance/financial-management/responsibility-centers/:id/status` | Activate/inactivate |
| Delete | optional `DELETE /maintenance/financial-management/responsibility-centers/:id` | Prefer inactive or soft delete unless product requires delete |

Controller rules:

- Use `JwtAuthGuard`.
- Use `@CurrentUser()` for tenant context.
- Keep controller methods as route + service calls only.
- Use DTO classes for body/query validation.

## Recommended Response Shape

```ts
type ResponsibilityCenterResponse = {
  id: string;
  code: string;
  name: string;
  category: ResponsibilityCenterCategory;
  financialType: ResponsibilityCenterFinancialType;
  manager: string;
  parentId: string | null;
  parentName: string | null;
  status: ResponsibilityCenterStatus;
  description: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string;
};
```

Tree response, if implemented:

```ts
type ResponsibilityCenterTreeNodeResponse = ResponsibilityCenterResponse & {
  children: ResponsibilityCenterTreeNodeResponse[];
};
```

Backend enums should use stable uppercase values. Frontend can map them to current display labels.

| Backend | Frontend |
|---|---|
| `COST_CENTER` | `Cost Center` |
| `PROFIT_CENTER` | `Profit Center` |
| `REVENUE_CENTER` | `Revenue Center` |
| `INVESTMENT_CENTER` | `Investment Center` |
| `ACTIVE` | `Active` |
| `INACTIVE` | `Inactive` |

## Recommended Prisma Additions

Add a company-scoped table.

```prisma
model ResponsibilityCenter {
  id                       BigInt                              @id @default(autoincrement())
  companyId                Int                                 @map("company_id")
  code                     String                              @db.VarChar(50)
  name                     String                              @db.VarChar(150)
  category                 ResponsibilityCenterCategory
  financialType            ResponsibilityCenterFinancialType   @map("financial_type")
  manager                  String?                             @db.VarChar(150)
  parentId                 BigInt?                             @map("parent_id")
  status                   ResponsibilityCenterStatus          @default(ACTIVE)
  description              String?                             @db.VarChar(500)
  createdByUserId          Int?                                @map("created_by_user_id")
  updatedByUserId          Int?                                @map("updated_by_user_id")
  deletedAt                DateTime?                           @map("deleted_at")
  createdAt                DateTime                            @default(now()) @map("created_at")
  updatedAt                DateTime                            @updatedAt @map("updated_at")

  company                  Company                             @relation(fields: [companyId], references: [id], onDelete: Cascade)
  parent                   ResponsibilityCenter?               @relation("ResponsibilityCenterHierarchy", fields: [parentId], references: [id], onDelete: Restrict)
  children                 ResponsibilityCenter[]              @relation("ResponsibilityCenterHierarchy")

  @@unique([companyId, code], map: "responsibility_centers_company_code_key")
  @@unique([companyId, name], map: "responsibility_centers_company_name_key")
  @@index([companyId, status], map: "responsibility_centers_company_status_idx")
  @@index([companyId, category], map: "responsibility_centers_company_category_idx")
  @@index([companyId, financialType], map: "responsibility_centers_company_financial_type_idx")
  @@index([companyId, parentId], map: "responsibility_centers_company_parent_idx")
  @@map("responsibility_centers")
}

enum ResponsibilityCenterCategory {
  CORPORATE
  DIVISION
  DEPARTMENT
  SECTION
  TEAM
  BRANCH
  BUILDING
  PROJECT
  BUSINESS_UNIT
  REGION
  SALESMAN
  WAREHOUSE
  OUTLET
  SALES_TERRITORY
  FLEET
}

enum ResponsibilityCenterFinancialType {
  COST_CENTER
  PROFIT_CENTER
  REVENUE_CENTER
  INVESTMENT_CENTER
}

enum ResponsibilityCenterStatus {
  ACTIVE
  INACTIVE
}
```

If the project has an established shared status enum for maintenance records, reuse it instead of introducing `ResponsibilityCenterStatus`.

## DTO Rules

Create DTO:

```ts
type CreateResponsibilityCenterRequest = {
  code: string;
  name: string;
  category: ResponsibilityCenterCategory;
  financialType: ResponsibilityCenterFinancialType;
  manager?: string;
  parentId?: string;
  status?: ResponsibilityCenterStatus;
  description?: string;
};
```

Validation requirements:

- `code` required, trim, uppercase, max 50.
- `name` required, trim, max 150.
- `category` required enum.
- `financialType` required enum.
- `parentId` optional string ID.
- `description` optional, max 500.

List query DTO:

- `search?: string`
- `status?: ACTIVE | INACTIVE`
- `category?: ResponsibilityCenterCategory`
- `financialType?: ResponsibilityCenterFinancialType`
- `page?: number`
- `pageSize?: number`
- `sortBy?: string`
- `sortDirection?: asc | desc`

## Service Rules

Service owns all business rules:

1. Resolve company context from `AuthUser`.
2. Check active company access.
3. Validate duplicate code per company.
4. Validate duplicate name per company.
5. Validate parent belongs to same company.
6. Prevent parent from being self.
7. Prevent hierarchy cycles.
8. Use transactions for create/update/status changes when related rows may be affected.
9. Return mapped response objects only.

Do not build response shapes in the controller.

## Financial Type Defaults

The frontend currently owns the visible Type and Classification choices. If the backend allows `financialType` to be omitted in the future, use these frontend classification defaults as the initial source of truth. If `financialType` remains required, treat this table as a UI-alignment reference only.

Recommended backend defaults:

| Category | Financial Type |
|---|---|
| Department | `COST_CENTER` |
| Branch | `PROFIT_CENTER` |
| Project | `COST_CENTER` |
| Business Unit | `PROFIT_CENTER` |
| Salesman | `REVENUE_CENTER` |
| Warehouse | `COST_CENTER` |
| Division | `PROFIT_CENTER` |
| Region | `PROFIT_CENTER` |

Place this in a module-owned constants or utility file, not in `common`.

Recommended file:

```text
src/modules/maintenance/responsibility-center/utils/responsibility-center-defaults.util.ts
```

## Tree Rules

Backend can return either flat rows or a tree endpoint.

Flat list is required. Tree endpoint is optional.

Tree rules:

- Only include records from the active company.
- Exclude soft-deleted records.
- Sort siblings by code or name consistently.
- Orphaned records should not happen; if legacy data has orphans, return them as roots and flag in logs.
- Inactive parent records may still appear when listing inactive/all records so children are not lost.

## Status Rules

Inactivation:

- Set status to `INACTIVE`.
- Do not delete the row.
- Do not automatically inactivate children unless product explicitly decides cascading status.
- If transactions already reference a center, inactivation remains allowed because history must stay intact.

Activation:

- Parent, if present, must belong to the same company.
- Product decision: either allow active child under inactive parent, or require parent active. Prefer requiring parent active for new data.

## Transaction Usage Rules

Responsibility Center should be selectable by transaction modules later.

Recommended future transaction reference:

| Scope | Field |
|---|---|
| Header-level assignment | `responsibility_center_id` |

Backend validation in transaction modules should:

1. Load the selected center by `companyId`.
2. Require `status = ACTIVE`.
3. Validate category/financial type compatibility when a module has restrictions.
4. Respect module-specific required-field rules when those modules define them.
5. Preserve stored IDs in transaction history even if the center is later renamed or inactivated.

## Default Company Seed

Company-owned defaults belong in company bootstrap.

Recommended seed file:

```text
src/modules/maintenance/responsibility-center/seed/responsibility-center.seed.ts
```

Recommended export:

```ts
export async function seedCompanyResponsibilityCenterDefaults(
  prisma: PrismaClient | Prisma.TransactionClient,
  companyId: number,
) {
  // Skip if the company already has non-deleted responsibility centers.
  // Create default records in parent-before-child order.
}
```

Seed rules:

1. If company already has any non-deleted responsibility center rows, do not reseed.
2. Create parent rows first.
3. Resolve children by default code, not by generated ID constants.
4. Use `createdByUserId: null` for system defaults.
5. Preserve the default hierarchy listed in this document.

Wire the seed into company creation paths that already seed Terms, COA, Bank, Discounts, and Default Accounts.

Known paths to inspect:

```text
src/modules/onboarding/onboarding.service.ts
src/modules/workspace/companies/workspace-companies.service.ts
```

Target ordering:

```ts
await seedCompanyChartAccountDefaults(...);
await seedCompanyResponsibilityCenterDefaults(...);
```

Responsibility Center does not depend on COA today, so it can run before or after COA. Keep it near other maintenance defaults.

If company bootstrap repair is used for existing companies, add a handler or extend the registry according to:

```text
prisma/company-bootstrap/company-bootstrap.registry.ts
docs/architecture/company-bootstrap-repair.md
```

## Permissions

Recommended module code:

```text
RC
```

Recommended permission actions:

| Action | Permission |
|---|---|
| View/list | `RC:VIEW` |
| Create | `RC:CREATE` |
| Update/status | `RC:UPDATE` |
| Delete/inactivate | `RC:DELETE` or `RC:UPDATE` depending on existing catalog style |
| Export | `RC:EXPORT` |

Follow existing permission catalog patterns. If platform module metadata changes are needed, wire them through provisioning, not a manual seed.

## Mapper Rules

Create:

```text
src/modules/maintenance/responsibility-center/mappers/responsibility-center.mapper.ts
```

Mapper responsibilities:

- Convert bigint IDs to strings.
- Convert dates to ISO strings.
- Convert null manager/description to empty string only if the current API convention does so. Otherwise return null and let frontend map display values.
- Include `parentName` when parent is loaded.
- Do not leak Prisma relation objects.

## Import/Export

Frontend already has table export. Backend export is optional.

If import is added later, support columns:

```text
Code, Name, Type, Classification, Parent Center, Manager, Status, Description
```

Import validation:

- Reject duplicate codes inside upload.
- Reject duplicate names inside upload.
- Reject duplicates against company rows.
- Resolve parent by code first, then name.
- Fail row when parent is missing.
- Prevent cycles in imported hierarchy.

## Frontend Switch After Backend

Replace mock-backed store in:

```text
gr8bookslite-frontend/app/src/hooks/modules/maintenance/responsibility-center/useResponsibilityCenter.ts
```

with services:

```text
gr8bookslite-frontend/app/src/services/modules/maintenance/responsibility-center/ResponsibilityCenterApi.ts
gr8bookslite-frontend/app/src/services/modules/maintenance/responsibility-center/ResponsibilityCenterQueryKeys.ts
```

Frontend should stop importing:

```text
MockResponsibilityCenters
```

once backend is live.

Recommended service functions:

- `fetchResponsibilityCenters`
- `fetchResponsibilityCenterTree` if tree endpoint is implemented
- `createResponsibilityCenter`
- `updateResponsibilityCenter`
- `updateResponsibilityCenterStatus`

Keep frontend validation for user experience, but backend validation is authoritative.

## Verification Checklist

After backend implementation:

1. `GET /maintenance/financial-management/responsibility-centers` returns seeded defaults for a new company.
2. Tree view can be built from list response with parent IDs.
3. Duplicate code is rejected per company.
4. Duplicate name is rejected per company.
5. Parent from another company is rejected.
6. Self-parent is rejected.
7. Parent cycle is rejected.
8. Inactive rows remain visible when status filter is all/inactive.
9. Status update does not delete historical records.
10. Company creation seeds default rows exactly once.
11. Existing company bootstrap repair can seed missing rows without duplicating existing companies.
12. Frontend no longer depends on `MockResponsibilityCenters` after API wiring.

## Implementation Checklist

1. Add Prisma model/enums and migration.
2. Add DTOs.
3. Add mapper.
4. Add service with duplicate and hierarchy validation.
5. Add controller.
6. Add module and register in `app.module.ts`.
7. Add company default seed helper.
8. Wire seed into onboarding and workspace company creation.
9. Add bootstrap repair support for existing companies if required.
10. Add unit tests for service validation and mapper.
11. Add e2e/controller tests if the backend test pattern supports it.
12. Wire frontend service and remove mock data.

## Suggested Checks

Run near the end of backend implementation:

```bash
npm run typecheck
npm test -- --runInBand
node --test scripts/env/database-guard.test.cjs
node --test scripts/env/package-scripts.test.cjs
```

If Prisma schema changes:

```bash
npm run db:migrate:local
npm run db:provision:local
npm run db:repair:company-bootstrap:local -- --apply
```
