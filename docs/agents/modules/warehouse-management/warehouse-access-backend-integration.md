# Warehouse Access Backend Integration

## Purpose

This document defines the backend integration target for the Warehouse Access frontend module at `gr8bookslite-frontend/app/(modules)/maintenance/warehouse-access`.

Warehouse Access controls which active company users can work with each company warehouse. It is a company-owned access table tied to the existing warehouse-maintenance backend module, and it should be enforced by the backend for inventory workflows such as receiving, issuing, transfers, adjustments, location maintenance, stock viewing, and movement history.

## References

- Frontend route: `gr8bookslite-frontend/app/(modules)/maintenance/warehouse-access`
- Frontend UI: `gr8bookslite-frontend/app/src/ui/modules/maintenance/warehouse-access`
- Frontend hooks: `gr8bookslite-frontend/app/src/hooks/modules/maintenance/warehouse-access`
- Frontend services: `gr8bookslite-frontend/app/src/services/modules/maintenance/warehouse-access`
- Frontend constants/types/validation: `gr8bookslite-frontend/app/src/constants/modules/maintenance/warehouse-access`, `gr8bookslite-frontend/app/src/types/modules/maintenance/warehouse-access`, `gr8bookslite-frontend/app/src/validations/modules/maintenance/warehouse-access`
- Warehouse backend module: `gr8bookslite-backend/src/modules/maintenance/warehouse-maintenance`
- Warehouse backend integration note: `gr8bookslite-backend/docs/agents/modules/warehouse-management/warehouse-management-backend-integration.md`
- Required rules: `gr8bookslite-frontend/AGENTS.md`, `gr8bookslite-frontend/FRONTEND_MAP.md`, `gr8bookslite-backend/docs/agents/guides/ARCHITECTURE_MODULARITY_GUIDE.md`, `gr8bookslite-backend/docs/agents/guides/BACKEND_INTEGRATION_GUIDE.md`

## Current State

### Frontend

The route files are thin and render UI from `app/src/ui/...`:

```text
app/(modules)/maintenance/warehouse-access/page.tsx
app/(modules)/maintenance/warehouse-access/add/page.tsx
app/(modules)/maintenance/warehouse-access/edit/[recordId]/page.tsx
app/(modules)/maintenance/warehouse-access/view/[recordId]/page.tsx
```

Current runtime behavior is still mock/local-storage backed:

- `useWarehouseAccessWorkspace.ts` loads warehouses and assigned access from `WarehouseAccessWarehouseData.ts`.
- `useWarehouseAccessFormPage.ts` grants selected users access to selected warehouses through local state.
- `useWarehouseAccessRecordFormPage.ts` handles add/edit/view routes through warehouse access row mappers.
- `useWarehouseAccessListPage.ts` contains an older table-style list flow that also reads mock warehouses.
- `WarehouseAccessApi.ts` and `WarehouseAccessQueryKeys.ts` exist, but `fetchWarehouseAccess()` returns an empty array and mutations only echo local values.
- `WarehouseAccessUserData.ts` provides mock users and branch labels for the grant-access screen.

When backend integration is complete, runtime hooks must use `ApiClient` and React Query instead of `WarehouseAccessMockWarehouses`, `WarehouseAccessMockUsers`, and `localStorage`.

### Backend

There is no dedicated Warehouse Access backend module yet. The closest implemented module is:

```text
src/modules/maintenance/warehouse-maintenance
```

Reuse that module's established patterns:

- `JwtAuthGuard`
- `@CurrentUser()` for active company context
- Versioned route under `/api/v1/maintenance/...`
- Prisma records scoped by `companyId`
- DTO validation with `class-validator`
- Mapper serializes BigInt IDs as strings
- Thin controller and service-owned business rules
- Permission response in list/detail payloads

## Backend Target

Create a dedicated backend module:

```text
gr8bookslite-backend/src/modules/maintenance/warehouse-access/
  warehouse-access.module.ts
  warehouse-access.controller.ts
  warehouse-access.service.ts
  dto/
    create-warehouse-access.dto.ts
    get-warehouse-access-list-query.dto.ts
    get-warehouse-access-directory-query.dto.ts
    update-warehouse-access.dto.ts
  mappers/
    warehouse-access.mapper.ts
  prisma/
    warehouse-access.include.ts
  types/
    warehouse-access-with-relations.type.ts
  utils/
    warehouse-access-permission.util.ts
```

Register the module in the backend app module or existing maintenance module registration point, following the current maintenance module pattern.

## Backend Route Contract

Base path:

```text
/api/v1/maintenance/warehouse-access
```

Frontend constant:

```ts
export const WarehouseAccessApiPath = "/maintenance/warehouse-access";
```

Endpoints:

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/maintenance/warehouse-access` | List warehouse access records for the active company with warehouse/user filters, search, status, permission, sorting, pagination, statistics, and permissions. |
| `GET` | `/maintenance/warehouse-access/:id` | Fetch one warehouse access assignment. |
| `POST` | `/maintenance/warehouse-access` | Create one or more warehouse access assignments. Supports the bulk grant screen. |
| `PATCH` | `/maintenance/warehouse-access/:id` | Update permissions, access level, and status for one assignment. |
| `DELETE` | `/maintenance/warehouse-access/:id` | Revoke one assignment. Hard delete is acceptable because this table represents an authorization grant; keep audit fields if soft-delete is preferred. |
| `GET` | `/maintenance/warehouse-access/directory/users` | List active company users available for grant-access selection, with branch/unit labels. |

Keep the controller thin. All tenant checks, membership checks, warehouse validation, duplicate checks, and permission rules belong in the service.

## Frontend Query Contract

Map current frontend state to backend query parameters:

| Frontend field | Backend query param | Values |
| --- | --- | --- |
| `warehouseId` | `warehouseId` | Warehouse ID, or omitted for all warehouses. |
| `query` | `search` | Free-text search against warehouse code/name, user name/email, status, access level, and permission labels. |
| `statusFilter` | `status` | `ACTIVE`, `INACTIVE`, or omitted for all. |
| `permissionFilter` | `permission` | Backend permission enum, or omitted for all. |
| `branchFilter` | `branchUnitId` | Company unit ID for directory/user filtering. |
| `pagination.pageIndex` | `page` | Convert to 1-based page. |
| `pagination.pageSize` | `limit` | Current table page size. |
| `sorting[0].id` | `sortBy` | `warehouse`, `user`, `accessLevel`, `status`, `createdAt`, `updatedAt`. |
| `sorting[0].desc` | `sortDirection` | `asc` or `desc`. |

Query keys must include tenant scope if `companyId` or `activeUnitId` is available in the hook:

```ts
["maintenance", "warehouse-access", companyId, activeUnitId, filters, pagination, sorting]
```

## Data Model

Add Prisma enums:

```prisma
enum WarehouseAccessLevel {
  VIEWER
  PICKER
  MANAGER
}

enum WarehouseAccessPermission {
  VIEW_STOCK
  RECEIVE_STOCK
  ISSUE_STOCK
  TRANSFER_STOCK
  ADJUST_STOCK
  MANAGE_LOCATIONS
  VIEW_HISTORY
}

enum WarehouseAccessStatus {
  ACTIVE
  INACTIVE
}
```

Add a company-scoped assignment model:

```prisma
model WarehouseAccess {
  id              BigInt                      @id @default(autoincrement())
  companyId       Int                         @map("company_id")
  warehouseId     BigInt                      @map("warehouse_id")
  userId          Int                         @map("user_id")
  accessLevel     WarehouseAccessLevel        @default(VIEWER) @map("access_level")
  permissions     WarehouseAccessPermission[]
  status          WarehouseAccessStatus       @default(ACTIVE)
  createdByUserId Int?                        @map("created_by_user_id")
  updatedByUserId Int?                        @map("updated_by_user_id")
  createdAt       DateTime                    @default(now()) @map("created_at")
  updatedAt       DateTime                    @updatedAt @map("updated_at")
  company         Company                     @relation(fields: [companyId], references: [id], onDelete: Cascade)
  warehouse       Warehouse                   @relation(fields: [warehouseId], references: [id], onDelete: Cascade)
  user            User                        @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([companyId, warehouseId, userId], map: "warehouse_access_company_warehouse_user_key")
  @@index([companyId, warehouseId], map: "warehouse_access_company_warehouse_idx")
  @@index([companyId, userId], map: "warehouse_access_company_user_idx")
  @@index([companyId, status], map: "warehouse_access_company_status_idx")
  @@map("warehouse_access")
}
```

Also add relations to `Company`, `Warehouse`, and `User` if Prisma requires them:

```prisma
warehouseAccess WarehouseAccess[]
```

Use a migration and regenerate Prisma client. Do not edit applied migrations.

## API Payload Mapping

Frontend labels map to backend enums:

| Frontend | Backend |
| --- | --- |
| `Viewer` | `VIEWER` |
| `Picker` | `PICKER` |
| `Manager` | `MANAGER` |
| `View Stock` | `VIEW_STOCK` |
| `Receive Stock` | `RECEIVE_STOCK` |
| `Issue Stock` | `ISSUE_STOCK` |
| `Transfer Stock` | `TRANSFER_STOCK` |
| `Adjust Stock` | `ADJUST_STOCK` |
| `Manage Locations` | `MANAGE_LOCATIONS` |
| `View History` | `VIEW_HISTORY` |
| `Active` | `ACTIVE` |
| `Inactive` | `INACTIVE` |

Create request should support both the bulk grant screen and single-record routes:

```ts
type ApiCreateWarehouseAccessPayload = {
  assignments: Array<{
    warehouseId: string;
    userId: number;
    accessLevel?: "VIEWER" | "PICKER" | "MANAGER";
    permissions: Array<
      | "VIEW_STOCK"
      | "RECEIVE_STOCK"
      | "ISSUE_STOCK"
      | "TRANSFER_STOCK"
      | "ADJUST_STOCK"
      | "MANAGE_LOCATIONS"
      | "VIEW_HISTORY"
    >;
    status?: "ACTIVE" | "INACTIVE";
  }>;
};
```

Update request:

```ts
type ApiUpdateWarehouseAccessPayload = {
  accessLevel?: "VIEWER" | "PICKER" | "MANAGER";
  permissions?: ApiWarehouseAccessPermission[];
  status?: "ACTIVE" | "INACTIVE";
};
```

List response:

```ts
type ApiWarehouseAccessListResponse = {
  warehouseAccess: ApiWarehouseAccessRecord[];
  statistics: {
    totalAssignments: number;
    activeAssignments: number;
    inactiveAssignments: number;
    managerAssignments: number;
    pickerAssignments: number;
    viewerAssignments: number;
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
    canDelete: boolean;
    canExport: boolean;
  };
};
```

Record response:

```ts
type ApiWarehouseAccessRecord = {
  id: string;
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  userId: number;
  userName: string;
  userEmail: string;
  accessLevel: "VIEWER" | "PICKER" | "MANAGER";
  permissions: ApiWarehouseAccessPermission[];
  status: "ACTIVE" | "INACTIVE";
  createdBy: string | null;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string;
};
```

Directory response for the grant-access screen:

```ts
type ApiWarehouseAccessDirectoryResponse = {
  users: Array<{
    id: number;
    name: string;
    email: string;
    contactNumber: string | null;
    status: "ACTIVE" | "PENDING_VERIFICATION" | "SUSPENDED";
    branchUnitIds: number[];
    branchNames: string[];
    companyRoleId: number | null;
    companyRoleName: string | null;
  }>;
  branches: Array<{
    id: number;
    name: string;
  }>;
};
```

## Backend Validation Rules

Backend validation is authoritative:

- Active company is required.
- User must have active company membership unless using a reserved platform/admin role.
- Current actor must have Warehouse Access module permission for the requested action.
- Each `warehouseId` must belong to the active company, must not be deleted, and should be readable even when inactive.
- Each `userId` must belong to an active membership in the active company.
- Do not allow duplicate active assignments for the same `companyId`, `warehouseId`, and `userId`.
- `permissions` must contain at least one value.
- `accessLevel` can be derived from permissions when omitted, but the response must always include it.
- `MANAGER` should imply all permissions if the backend accepts level-only payloads.
- `PICKER` default permissions are `VIEW_STOCK`, `ISSUE_STOCK`, and `TRANSFER_STOCK`.
- `VIEWER` default permissions are `VIEW_STOCK` and `VIEW_HISTORY`.
- Updates may change status and permissions, but must not move the record to a different company, warehouse, or user.
- Revoke/delete must verify the assignment belongs to the active company.
- Directory users should exclude users without active company membership.

## Permissions

Use the seeded Warehouse Access module code `WA` from the module catalog.

Recommended module actions:

| Action | Meaning |
| --- | --- |
| `VIEW` | List/read warehouse access assignments and directory options. |
| `CREATE` | Grant access. |
| `UPDATE` | Edit assignment permissions, level, and status. |
| `DELETE` | Revoke access. |
| `EXPORT` | Export list rows. |

Reserved company admin access should follow the same shape as `WarehouseMaintenanceService`: `SUPER_ADMIN`, company `ADMIN`, or active admin membership can bypass module-specific permission checks.

## Frontend Integration Steps

1. Replace `WarehouseAccessApi.ts` mock implementations with `ApiClient` calls for list, detail, create, update, revoke, and directory users.
2. Add API enum mappers beside the service or in the feature data layer if they are pure mappers.
3. Update `WarehouseAccessQueryKeys.ts` to include company/branch scope, filters, pagination, and sorting where available.
4. Update `useWarehouseAccessWorkspace.ts` to load warehouses from the existing warehouse service and assignments from the warehouse-access API.
5. Update `useWarehouseAccessFormPage.ts` to load directory users from `/directory/users` and submit bulk assignments through `POST /maintenance/warehouse-access`.
6. Update `useWarehouseAccessRecordFormPage.ts` to fetch detail records by ID and submit update mutations.
7. Keep frontend Zod validation for user experience, but let backend DTO/service validation own correctness.
8. Remove runtime dependence on `WarehouseAccessWarehouseData.ts`, `WarehouseAccessUserData.ts`, and `WarehouseAccessStorageKey`.
9. Keep table constants, hrefs, labels, and permission label options in `WarehouseAccessConstants.ts`.
10. Invalidate `WarehouseAccessQueryKeys.all(...)` after create, update, and revoke mutations.

## Backend Implementation Checklist

- Add Prisma enums, `WarehouseAccess` model, relations, migration, and generated client.
- Add warehouse-access module, controller, service, DTOs, mapper, include/type helpers, and tests.
- Register the module in backend module registration.
- Implement list filters, search, sorting, pagination, statistics, and permission response.
- Implement directory endpoint using company memberships, users, roles, and branch/unit access.
- Implement duplicate checks for `companyId + warehouseId + userId`.
- Implement bulk create in a short transaction after validating all warehouses and users.
- Implement update and revoke/delete with company scoping.
- Keep controllers thin and keep Prisma/query/business rules inside the service.
- Add Swagger decorators and response descriptions matching maintenance modules.
- Do not add company bootstrap defaults for access assignments unless product explicitly decides a default user should receive warehouse access.
- Do not add platform provisioning seed unless the WA module metadata or permissions are missing from the existing module catalog.

## Integration Acceptance Criteria

- Warehouse Access loads backend assignments for the active company.
- Opening from a warehouse via `?warehouseId=<id>` selects that warehouse and shows only its assignments.
- Grant Access can assign multiple users to multiple warehouses and persists after refresh/relogin.
- Duplicate grants are skipped or rejected with a user-friendly response; no duplicate assignment rows are created.
- Edit/view routes load persisted records by ID.
- Permission, status, and access-level changes persist.
- Revoke removes the assignment or marks it revoked according to the chosen backend strategy.
- Directory users come from active company memberships, not mock data.
- Warehouse and access records are company-scoped and do not leak across company context.
- Permission-denied users receive backend `403` responses and frontend actions are hidden or disabled from returned permissions.
- Runtime no longer uses warehouse-access mock warehouses, mock users, or local storage.

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

Manual QA:

1. Log in to a company with at least two warehouses and two active users.
2. Open `/maintenance/warehouse-access` and confirm assignments load from the API.
3. Open Warehouse Access from a warehouse row and confirm `warehouseId` preselects that warehouse.
4. Grant two users access to two warehouses with different permissions.
5. Refresh and confirm the assignments remain.
6. Edit one assignment, change permissions/status, refresh, and confirm the update remains.
7. Revoke one assignment and confirm it no longer appears for that warehouse.
8. Switch company context and confirm previous company assignments are not visible.
9. Test a user without `WA` permissions and confirm backend denial plus frontend-disabled actions.
