# Warehouses Backend Integration

## Purpose

This document defines the current backend integration contract for the Warehouses frontend module at `gr8bookslite-frontend/app/(modules)/maintenance/warehouses` and the backend module at `gr8bookslite-backend/src/modules/maintenance/warehouse-maintenance`.

Warehouses are company-owned inventory locations used by receiving, issuing, transfer, stock inquiry, storage location, and warehouse access workflows. The required initial company data is one active `Main Warehouse` record per company.

## Current State

### Frontend

The Warehouses frontend is drawer-first. Add, edit, and view actions are handled by `WarehouseDrawer`; there are no standalone warehouse add/edit/view action pages.

Active route files:

- `app/(modules)/maintenance/warehouses/page.tsx`
- `app/(modules)/maintenance/warehouses/view/[recordId]/items/page.tsx`

Removed and intentionally not used:

- `app/(modules)/maintenance/warehouses/add/page.tsx`
- `app/(modules)/maintenance/warehouses/edit/[recordId]/page.tsx`
- `app/(modules)/maintenance/warehouses/view/[recordId]/page.tsx`
- `app/(modules)/maintenance/warehouses/view/[recordId]/access/page.tsx`

Warehouse access is owned by the dedicated module:

- Frontend route: `app/(modules)/maintenance/warehouse-access`
- Frontend UI/source: `app/src/ui/modules/maintenance/warehouse-access`
- Warehouse links should use `createWarehouseAccessHref(warehouseId)`, which routes to warehouse access with a `warehouseId` query parameter.

The Warehouses feature code is split by concern:

- UI: `app/src/ui/modules/maintenance/warehouses`
- Hooks/store: `app/src/hooks/modules/maintenance/warehouses`
- Types: `app/src/types/modules/maintenance/warehouses/WarehouseTypes.ts`
- Data/mappers: `app/src/data/modules/maintenance/warehouses/WarehouseData.ts`
- Constants: `app/src/constants/modules/maintenance/warehouses/WarehouseConstants.ts`
- Validation: `app/src/validations/modules/maintenance/warehouses/WarehouseValidation.ts`
- API/query helpers: `app/src/services/modules/maintenance/warehouses`

Runtime warehouse data is backend-backed through `WarehouseApi.ts` and React Query. Mock warehouse data should not be used for normal runtime flows.

### Backend

The backend persistence module is implemented under:

```text
src/modules/maintenance/warehouse-maintenance
```

Implemented backend files:

- `warehouse-maintenance.module.ts`
- `warehouse-maintenance.controller.ts`
- `warehouse-maintenance.service.ts`
- `dto/create-warehouse.dto.ts`
- `dto/update-warehouse.dto.ts`
- `dto/get-warehouse-list-query.dto.ts`
- `mappers/warehouse-maintenance.mapper.ts`
- `prisma/warehouse-maintenance.include.ts`
- `seed/warehouse-maintenance.seed.ts`
- `types/warehouse-maintenance-with-branches.type.ts`

The module follows the maintenance backend pattern:

- `JwtAuthGuard`
- `@CurrentUser()` for active company context
- Versioned Nest route under `/api/v1/maintenance/...`
- Prisma records scoped by `companyId`
- DTO validation with `class-validator`
- Mapper serializes BigInt IDs as strings
- List/create/update endpoint pattern
- Statistics and permissions in list responses
- Company bootstrap seed for the required default `Main Warehouse`

## Backend Route Contract

Base path:

```text
/api/v1/maintenance/warehouse-maintenance
```

Frontend constant:

```ts
export const WarehouseApiPath = "/maintenance/warehouse-maintenance";
```

Endpoints:

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/maintenance/warehouse-maintenance` | List warehouses for the active company with search, filters, sorting, pagination, statistics, and permissions. |
| `GET` | `/maintenance/warehouse-maintenance/:id` | Fetch one warehouse record. |
| `POST` | `/maintenance/warehouse-maintenance` | Create one warehouse. |
| `PATCH` | `/maintenance/warehouse-maintenance/:id` | Update warehouse details, branch availability, branch selections, and status. |

There is no physical delete endpoint for normal UI flows. The frontend “delete” action is an activate/deactivate status change.

## Frontend Query Contract

Map warehouse list state to backend query parameters:

| Frontend field | Backend query param | Values |
| --- | --- | --- |
| `query` | `search` | Free-text search against code, name, manager, address, contact number, and branch names. |
| `branchFilter` | `branchUnitId` | Company unit ID, or omitted for all. |
| `statusFilter` | `status` | `ACTIVE`, `INACTIVE`, or omitted for all. |
| `pagination.pageIndex` | `page` | Convert to 1-based page before sending. |
| `pagination.pageSize` | `limit` | Current table page size. |
| `sorting[0].id` | `sortBy` | `code`, `name`, `managerName`, `status`, `createdAt`, `updatedAt`. |
| `sorting[0].desc` | `sortDirection` | `asc` or `desc`. |

List response:

```ts
type ApiWarehouseListResponse = {
  warehouses: ApiWarehouse[];
  statistics: {
    totalWarehouses: number;
    activeWarehouses: number;
    inactiveWarehouses: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  permissions: {
    canView: boolean;
    canCreate: boolean;
    canUpdate: boolean;
    canExport: boolean;
  };
};
```

## Data Model

Prisma enums:

```prisma
enum WarehouseStatus {
  ACTIVE
  INACTIVE
}

enum WarehouseBranchAvailabilityMode {
  ALL
  SPECIFIC
  EXCEPT
}
```

Prisma models:

```prisma
model Warehouse {
  id                     BigInt                          @id @default(autoincrement())
  companyId              Int                             @map("company_id")
  code                   String                          @db.VarChar(80)
  name                   String                          @db.VarChar(180)
  managerName            String?                         @map("manager_name") @db.VarChar(180)
  branchAvailabilityMode WarehouseBranchAvailabilityMode @default(SPECIFIC) @map("branch_availability_mode")
  status                 WarehouseStatus                 @default(ACTIVE)
  address                String?                         @db.VarChar(500)
  contactNo              String?                         @map("contact_no") @db.VarChar(40)
  description            String?                         @db.VarChar(500)
  createdByUserId        Int?                            @map("created_by_user_id")
  updatedByUserId        Int?                            @map("updated_by_user_id")
  createdAt              DateTime                        @default(now()) @map("created_at")
  updatedAt              DateTime                        @updatedAt @map("updated_at")

  company                Company                         @relation(fields: [companyId], references: [id], onDelete: Cascade)
  branches               WarehouseBranch[]

  @@unique([companyId, code], map: "warehouses_company_code_key")
  @@unique([companyId, name], map: "warehouses_company_name_key")
  @@index([companyId, status], map: "warehouses_company_status_idx")
  @@map("warehouses")
}

model WarehouseBranch {
  id          BigInt      @id @default(autoincrement())
  warehouseId BigInt      @map("warehouse_id")
  unitId      Int         @map("unit_id")
  warehouse   Warehouse   @relation(fields: [warehouseId], references: [id], onDelete: Cascade)
  unit        CompanyUnit @relation(fields: [unitId], references: [id], onDelete: Cascade)

  @@unique([warehouseId, unitId], map: "warehouse_branches_warehouse_unit_key")
  @@index([unitId], map: "warehouse_branches_unit_id_idx")
  @@map("warehouse_branches")
}
```

The `WarehouseBranchAvailabilityMode` field is important because warehouse availability is not just a static list of selected branches. It controls how new company branches affect existing warehouses.

## Branch Availability Rules

Backend enum values:

| Mode | Meaning | Branch links |
| --- | --- | --- |
| `ALL` | Warehouse is available to every active branch, including branches created later. | The submitted `branchUnitIds` are normalized to all active company units. |
| `SPECIFIC` | Warehouse is available only to selected branches. | At least one selected branch is required. |
| `EXCEPT` | Warehouse is available to every active branch except selected branches. | Selected branches represent exclusions. Empty selection means no exclusions. |

Frontend display values:

| Frontend | Backend |
| --- | --- |
| `All Branches` | `ALL` |
| `Specific Branches` | `SPECIFIC` |
| `Except Branches` | `EXCEPT` |

Filtering by `branchUnitId` must respect the availability mode:

- `ALL` records match every active company unit.
- `SPECIFIC` records match when a linked branch equals the filter.
- `EXCEPT` records match when the filtered branch is not in the exclusion links.

## API Payload Mapping

Frontend status values:

| Frontend | Backend |
| --- | --- |
| `Active` | `ACTIVE` |
| `Inactive` | `INACTIVE` |

Create/update request:

```ts
type ApiWarehousePayload = {
  code?: string;
  name: string;
  branchUnitIds: string[];
  branchAvailabilityMode: "ALL" | "SPECIFIC" | "EXCEPT";
  managerName?: string | null;
  status?: "ACTIVE" | "INACTIVE";
  address?: string | null;
  contactNo?: string | null;
  description?: string | null;
};
```

Response record:

```ts
type ApiWarehouse = {
  id: string;
  code: string;
  name: string;
  branchUnitIds: string[];
  branchAvailabilityMode?: "ALL" | "SPECIFIC" | "EXCEPT";
  branches: Array<{
    id: string;
    code: string;
    name: string;
  }>;
  managerName: string | null;
  status: "ACTIVE" | "INACTIVE";
  address: string | null;
  contactNo: string | null;
  description: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string;
};
```

Frontend `WarehouseRecord` mapping:

- `id`, `code`, `name`, `managerName`, `address`, `contactNo`, `description`: direct mapped values, with nullable strings rendered as empty strings.
- `status`: map `ACTIVE`/`INACTIVE` to `Active`/`Inactive`.
- `branchAvailabilityMode`: map `ALL`/`SPECIFIC`/`EXCEPT` to display labels.
- `availableBranches`: map from `branches[].name`.
- `branchName` and `availability`: derive through warehouse data helpers.
- `access`, `items`, `locations`, `movements`, `transfers`: keep empty arrays in the warehouse mapper until their own backend modules are integrated.

## Backend Validation Rules

Mirror the frontend Zod schema in backend DTO/service validation:

- Active company is required.
- User must have active company membership unless using a reserved platform/admin role.
- `name` is required, trimmed, non-empty, and unique per company.
- `code` is optional on create if the backend generates it; final code must be non-empty and unique per company.
- `status` defaults to `ACTIVE`.
- `branchAvailabilityMode` defaults to `SPECIFIC` when omitted.
- `branchUnitIds` must reference active company units owned by the active company.
- `SPECIFIC` requires at least one valid branch.
- `ALL` is company-wide and remains available to branches added later.
- `EXCEPT` may have zero or more excluded branches.
- `managerName`, `address`, `contactNo`, and `description` should be trimmed and nullable/empty normalized consistently.
- Inactive warehouses should remain readable but should be excluded from active transaction dropdowns.

## Permissions

Use the seeded Warehouse Management module code `WM` from `MODULE_ROUTE_MAP.WM`.

Permission behavior:

- `VIEW`: list/read warehouses.
- `CREATE`: create warehouses.
- `UPDATE`: edit warehouse details and activate/deactivate.
- `EXPORT`: allow frontend export actions.

Reserved company admin access follows the same shape as `TermMaintenanceService`: `SUPER_ADMIN`, company `ADMIN`, or active admin membership can bypass module-specific permission checks.

## Company Bootstrap Seed

`Main Warehouse` is company-owned default data and is wired through company bootstrap, not platform provisioning.

Seed helper:

```text
src/modules/maintenance/warehouse-maintenance/seed/warehouse-maintenance.seed.ts
```

Default warehouse per company:

| Field | Value |
| --- | --- |
| `code` | `WH-MAIN` |
| `name` | `Main Warehouse` |
| `status` | `ACTIVE` |
| `branchAvailabilityMode` | `ALL` |
| `description` | `Primary company warehouse.` |
| `createdByUserId` | `null` |

Branch assignment:

- Prefer the active head office from company bootstrap for initial branch links.
- The record itself uses `ALL`, so future branches are covered by availability mode even if they were not present during the original bootstrap.
- Keep warehouse bootstrap after `head-office`.

Registry integration:

```text
prisma/company-bootstrap/company-bootstrap.registry.ts
```

The registry should include:

- Import for `WarehouseMaintenanceSeedRecords` and `seedCompanyWarehouseMaintenanceDefaults`.
- Backup count for `warehouses`.
- Handler key: `warehouses`.
- Inspect step checking `Main Warehouse` by `code` or `name`.
- Apply step calling the warehouse seed helper.

Do not add `Main Warehouse` to platform provisioning or module catalog seed files. Module metadata already exists for Warehouse Management; this default is tenant/company data.

## Frontend Integration Notes

- `WarehouseApiPath` belongs in `WarehouseConstants.ts`.
- API response/payload/types belong in `WarehouseTypes.ts`.
- Runtime requests belong in `app/src/services/modules/maintenance/warehouses/WarehouseApi.ts`.
- Query keys belong in `WarehouseQueryKeys.ts`.
- `useWarehouses.ts` should call `WarehouseApi.ts`; it should not depend on `MockWarehouses` for runtime flows.
- Invalidate `WarehouseQueryKeys.all(companyId)` after create/update/status changes.
- Keep frontend validation for user experience, but rely on backend validation as the source of truth.
- Replace hard-coded branch labels with backend/company-unit branch data where available.
- Add/edit/view should open `WarehouseDrawer`; do not reintroduce standalone action pages.

## Backend Implementation Checklist

- Add `WarehouseStatus`, `WarehouseBranchAvailabilityMode`, `Warehouse`, and `WarehouseBranch` to `prisma/schema.prisma`.
- Add migration and regenerate Prisma client.
- Add `WarehouseMaintenanceModule`, controller, service, DTOs, mapper, and tests.
- Register the module in the backend app module/maintenance module following existing patterns.
- Implement list statistics and permission response.
- Implement company-scoped duplicate checks for `code` and `name`.
- Implement branch/unit validation against active company units.
- Implement availability-aware branch filtering for `ALL`, `SPECIFIC`, and `EXCEPT`.
- Implement warehouse branch replacement transactionally during create/update.
- Implement `Main Warehouse` company bootstrap helper and registry handler.
- Keep controllers thin and keep Prisma/query/business rules inside the service.
- Add Swagger response descriptions matching the term-maintenance pattern.

## Integration Acceptance Criteria

- Warehouse list loads from the backend for the active company.
- A newly bootstrapped company has exactly one active `Main Warehouse`.
- `Main Warehouse` uses `ALL` branch availability.
- Add, edit, view drawer, refresh, and activate/deactivate persist after refresh and relogin.
- Search, status filter, branch filter, sorting, and pagination return backend-backed results.
- Branch filtering correctly handles `ALL`, `SPECIFIC`, and `EXCEPT`.
- Warehouse records are company-scoped and inaccessible across company contexts.
- Permission-denied users receive backend `403` responses and frontend actions are hidden or disabled according to returned permissions.
- Mock warehouse data is no longer used in runtime flows.
- `Main Warehouse` is repairable through company bootstrap repair, not a manual-only seed.

## Verification

Backend:

```bash
npm run typecheck
npm test -- --runInBand
node --test scripts/env/database-guard.test.cjs
node --test scripts/env/package-scripts.test.cjs
```

Frontend:

```bash
npm run lint
npm run build
```

Manual workflow:

1. Run company bootstrap repair for a company with no warehouses and confirm `Main Warehouse` is created.
2. Log in to that company and open Warehouses.
3. Confirm `Main Warehouse` appears as active and available to all branches.
4. Add a second warehouse with `Specific Branches`, edit it, refresh, and confirm the branch selection persists.
5. Change a warehouse to `Except Branches`, select excluded branches, and confirm branch filtering respects the exclusions.
6. Deactivate and reactivate a warehouse, refresh, and confirm state persists.
7. Use the warehouse view action and confirm it opens the frontend drawer rather than navigating to a standalone view page.
8. Open warehouse access from a warehouse and confirm it lands in the dedicated `warehouse-access` module with the warehouse selected.
9. Switch company context and confirm warehouses do not leak across companies.
