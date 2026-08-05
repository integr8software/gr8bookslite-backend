# Unit of Measurement Backend Integration Plan

This document defines the backend integration target for the frontend Unit of
Measurement module:

```text
gr8bookslite-frontend/app/(modules)/maintenance/unit-of-measurement/
gr8bookslite-frontend/app/src/ui/modules/maintenance/unit-of-measurement/
```

Use this together with:

```text
gr8bookslite-backend/docs/agents/BACKEND_INTEGRATION_GUIDE.md
gr8bookslite-backend/docs/agents/ARCHITECTURE_MODULARITY_GUIDE.md
gr8bookslite-frontend/AGENTS.md
gr8bookslite-frontend/FRONTEND_MAP.md
```

The closest existing implementation pattern is Term Management:

```text
gr8bookslite-backend/src/modules/maintenance/terms-maintenance/
gr8bookslite-frontend/app/src/services/modules/maintenance/term-management/
```

## Current State

The frontend Unit of Measurement page is currently mock-backed.

Frontend files already exist:

```text
app/src/ui/modules/maintenance/unit-of-measurement/UnitOfMeasurementPage.tsx
app/src/hooks/modules/maintenance/unit-of-measurement/useUnitOfMeasurementListPage.ts
app/src/data/modules/maintenance/unit-of-measurement/UnitOfMeasurementData.ts
app/src/types/modules/maintenance/unit-of-measurement/UnitOfMeasurementTypes.ts
app/src/constants/modules/maintenance/unit-of-measurement/UnitOfMeasurementConstants.ts
app/src/services/modules/maintenance/unit-of-measurement/UnitOfMeasurementQueryKeys.ts
```

Backend gaps:

- No Prisma `UnitOfMeasurement` model exists yet.
- No backend `unit-of-measurement` maintenance module exists yet.
- No frontend API service exists yet.
- The frontend hook still mutates `UnitOfMeasurementMockData` locally.
- The module already appears in the seeded sidebar catalog with module code
  `UOM`, so permissions should use `UOM:<ACTION>` unless the permission catalog
  proves a different code is already established.

## Frontend Contract To Support

The frontend currently expects this UI record shape:

```ts
type UnitOfMeasurementRecord = {
  id: string;
  name: string;
  symbol: string;
  quantityMode: "Integer" | "Float";
  status: "Active" | "Inactive";
  createdBy?: string | null;
  createdAt?: string;
  updatedBy?: string | null;
  updatedAt?: string;
};
```

The backend should expose uppercase API enum values and let the frontend service
map them into display values:

```ts
type ApiUnitOfMeasurementQuantityMode = "INTEGER" | "FLOAT";
type ApiUnitOfMeasurementStatus = "ACTIVE" | "INACTIVE";

type ApiUnitOfMeasurement = {
  id: string;
  name: string;
  symbol: string;
  quantityMode: ApiUnitOfMeasurementQuantityMode;
  status: ApiUnitOfMeasurementStatus;
  createdBy: string | null;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string;
};
```

Required list response:

```ts
type ApiUnitOfMeasurementListResponse = {
  units: ApiUnitOfMeasurement[];
  statistics: {
    totalUnits: number;
    activeUnits: number;
    inactiveUnits: number;
    decimalUnits: number;
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
    canImport: boolean;
  };
};
```

## Backend Module Target

Create a backend module under:

```text
src/modules/maintenance/unit-of-measurement/
  unit-of-measurement.module.ts
  unit-of-measurement.controller.ts
  unit-of-measurement.service.ts
  dto/
    create-unit-of-measurement.dto.ts
    get-unit-of-measurement-list-query.dto.ts
    import-unit-of-measurements.dto.ts
    update-unit-of-measurement.dto.ts
  mappers/
    unit-of-measurement.mapper.ts
  seed/
    unit-of-measurement.seed.ts
```

Register the module in:

```text
src/app.module.ts
```

Use the same module imports as Term Management unless the implementation proves
otherwise:

```ts
imports: [PrismaModule, AccessControlModule, AuthModule]
```

## Prisma Model Target

Add a company-owned UOM model and enums.

Suggested Prisma shape:

```prisma
model UnitOfMeasurement {
  id              BigInt                    @id @default(autoincrement())
  companyId       Int                       @map("company_id")
  name            String                    @db.VarChar(150)
  symbol          String                    @db.VarChar(30)
  quantityMode    UnitOfMeasurementQuantityMode @map("quantity_mode")
  status          UnitOfMeasurementStatus   @default(ACTIVE)
  createdByUserId Int?                      @map("created_by_user_id")
  updatedByUserId Int?                      @map("updated_by_user_id")
  deletedAt       DateTime?                 @map("deleted_at")
  createdAt       DateTime                  @default(now()) @map("created_at")
  updatedAt       DateTime                  @updatedAt @map("updated_at")
  company         Company                   @relation(fields: [companyId], references: [id], onDelete: Cascade)

  @@unique([companyId, name], map: "unit_of_measurements_company_name_key")
  @@unique([companyId, symbol], map: "unit_of_measurements_company_symbol_key")
  @@index([companyId], map: "unit_of_measurements_company_id_idx")
  @@index([companyId, status], map: "unit_of_measurements_company_status_idx")
  @@index([companyId, quantityMode], map: "unit_of_measurements_company_quantity_mode_idx")
  @@map("unit_of_measurements")
}

enum UnitOfMeasurementQuantityMode {
  INTEGER
  FLOAT
}

enum UnitOfMeasurementStatus {
  ACTIVE
  INACTIVE
}
```

Before finalizing relation names, search for item/product/inventory schema work
that may already need a relation to UOM. If item records will reference UOM,
add the relation during the same migration only when the consuming model is
ready and the data migration path is clear.

## API Routes

Use a versioned controller path aligned with the frontend route:

```ts
@Controller({
  path: "maintenance/unit-of-measurement",
  version: "1",
})
```

Required endpoints:

```text
GET    /api/v1/maintenance/unit-of-measurement
GET    /api/v1/maintenance/unit-of-measurement/:id
POST   /api/v1/maintenance/unit-of-measurement
POST   /api/v1/maintenance/unit-of-measurement/import
PATCH  /api/v1/maintenance/unit-of-measurement/:id
```

Soft delete can be added later if the UI gets a true delete action. The current
UI action is status toggling, so status updates can use `PATCH :id`.

## DTO Rules

Create DTO:

```ts
{
  name: string;
  symbol: string;
  quantityMode: UnitOfMeasurementQuantityMode;
  status?: UnitOfMeasurementStatus;
}
```

Validation:

- `name`: required, string, max 150, trim in service.
- `symbol`: required, string, max 30, trim and uppercase in service.
- `quantityMode`: enum `INTEGER | FLOAT`.
- `status`: optional enum `ACTIVE | INACTIVE`, default `ACTIVE`.

Update DTO:

```ts
{
  name?: string;
  symbol?: string;
  quantityMode?: UnitOfMeasurementQuantityMode;
  status?: UnitOfMeasurementStatus;
}
```

List query DTO:

```ts
{
  search?: string;
  quantityMode?: UnitOfMeasurementQuantityMode;
  status?: UnitOfMeasurementStatus;
  page?: number;
  limit?: number;
  sortBy?: "name" | "symbol" | "quantityMode" | "status" | "createdAt" | "updatedAt";
  sortDirection?: "asc" | "desc";
}
```

Follow `GetTermListQueryDto` for pagination transforms and max limits.

Import DTO:

```ts
{
  units: CreateUnitOfMeasurementDto[];
}
```

Reject duplicate names or symbols inside the uploaded payload before writing.

## Service Rules

Match the Term Management service structure.

Required service methods:

```ts
findAll(user, query)
findOne(user, id)
create(user, dto)
update(user, id, dto)
importUnits(user, dto)
```

Service responsibilities:

- Resolve active company from `AuthUser.companyId`.
- Ensure the user has company access.
- Enforce `UOM:VIEW`, `UOM:CREATE`, `UOM:UPDATE`, and `UOM:EXPORT`.
- Allow reserved admin roles the same way Term Management does.
- Filter by `companyId` and `deletedAt: null`.
- Search by `name`, `symbol`, and optionally `quantityMode`.
- Sort only by whitelisted fields.
- Validate duplicate `name` and duplicate `symbol` within the same company.
- Normalize `symbol` to uppercase.
- Set `createdByUserId` on create/import.
- Set `updatedByUserId` on update/status toggle.
- Return mapped API records, not raw Prisma records.

Friendly duplicate errors:

```text
A unit of measurement with this name already exists.
A unit of measurement with this symbol already exists.
```

## Mapper Rules

Create:

```text
src/modules/maintenance/unit-of-measurement/mappers/unit-of-measurement.mapper.ts
```

Mapper output should match the API contract:

```ts
{
  id: unit.id.toString(),
  name: unit.name,
  symbol: unit.symbol,
  quantityMode: unit.quantityMode,
  status: unit.status,
  createdBy,
  createdAt: unit.createdAt,
  updatedBy,
  updatedAt: unit.updatedAt,
}
```

Use `resolveAuditUserNames` and `SystemGeneratedAuditLabel`, matching Term
Management audit behavior.

## Statistics

The list endpoint should return:

```ts
{
  totalUnits: number;
  activeUnits: number;
  inactiveUnits: number;
  decimalUnits: number;
}
```

`decimalUnits` means `quantityMode === FLOAT`.

The frontend cards currently display:

- Total Units
- Active
- Decimal
- Inactive

Keep these names stable on the frontend even if backend enum names are
uppercase.

## Company Defaults

The current frontend mock default records are:

```text
Piece / PCS / INTEGER
Box / BOX / INTEGER
Pack / PACK / INTEGER
Kilogram / KG / FLOAT
Liter / L / FLOAT
```

Create a company bootstrap seed similar to Term Maintenance:

```text
src/modules/maintenance/unit-of-measurement/seed/unit-of-measurement.seed.ts
```

Suggested function:

```ts
seedCompanyUnitOfMeasurementDefaults(tx, companyId)
```

Wire it into company creation/bootstrap paths that currently call maintenance
defaults:

```text
src/modules/workspace/companies/workspace-companies.service.ts
src/modules/onboarding/onboarding.service.ts
prisma/company-bootstrap/company-bootstrap.registry.ts
```

Check the latest bootstrap registry before editing. Company-owned defaults must
not be left as a manual-only script.

## Frontend Wiring Target

Add the frontend API service:

```text
app/src/services/modules/maintenance/unit-of-measurement/UnitOfMeasurementApi.ts
```

Add constants:

```ts
export const UnitOfMeasurementApiPath = "/maintenance/unit-of-measurement";
```

Update query keys to include list/detail and tenant-sensitive filters if the
hook moves filtering to the backend:

```ts
UnitOfMeasurementQueryKeys.all()
UnitOfMeasurementQueryKeys.list(filters)
UnitOfMeasurementQueryKeys.detail(id)
```

Add API types beside the existing UI types:

```ts
ApiUnitOfMeasurement
ApiUnitOfMeasurementQuantityMode
ApiUnitOfMeasurementStatus
ApiUnitOfMeasurementListResponse
ApiUnitOfMeasurementSaveResponse
ApiUnitOfMeasurementImportResponse
UnitOfMeasurementPermissions
UnitOfMeasurementStatistics
```

Map API values in the frontend service:

```text
INTEGER -> Integer
FLOAT   -> Float
ACTIVE  -> Active
INACTIVE -> Inactive
```

Replace local mock mutations in:

```text
app/src/hooks/modules/maintenance/unit-of-measurement/useUnitOfMeasurementListPage.ts
```

with React Query mutations, following:

```text
app/src/hooks/modules/maintenance/term-management/useTermManagement.ts
```

After wiring, remove `UnitOfMeasurementMockData` usage from the page flow. Keep
pure helpers such as form defaults and table min-width logic if still useful.

## Frontend Table Expectations

Preserve the current table behavior:

- Column visibility.
- Export.
- Audit columns hidden by default but show/hideable.
- Quantity Type, Status, and Action centered in headers and rows.
- Dynamic table min width based on visible columns.
- Default status filter should remain `Active` unless product requirements
  change.

Do not remove the existing table preference keys without intentionally bumping
the version.

## Permissions

Use the module code already present in the sidebar seed:

```text
UOM
```

Permission checks should use:

```text
UOM:VIEW
UOM:CREATE
UOM:UPDATE
UOM:EXPORT
```

Import should require create permission unless the permission catalog introduces
a separate import action.

The list response should include permissions so the frontend can hide or disable
actions consistently.

## Tests And Verification

Backend checks:

```bash
npm run typecheck
npm test -- --runInBand
```

Add targeted tests for:

- Create UOM.
- Reject duplicate name in same company.
- Reject duplicate symbol in same company.
- List filters by status and quantity mode.
- Search by name and symbol.
- Update status Active/Inactive.
- Audit user names map correctly.
- Unauthorized user cannot access another company's UOM data.

Frontend checks after wiring:

```bash
npm run lint
npm run build
```

Manual QA:

- Open `/maintenance/unit-of-measurement`.
- Confirm default Active rows load from backend.
- Add a unit.
- Edit name/symbol/quantity type.
- Activate/deactivate a row.
- Show Audit Logs columns through column visibility.
- Export visible/filtered rows.
- Refresh the page and confirm data persists.

## Handoff Checklist

- Prisma model and enums added.
- Migration created and committed.
- Backend module registered in `AppModule`.
- DTOs, controller, service, mapper, and seed added.
- Company default UOM seed wired into bootstrap/provision flow.
- Permissions use `UOM:<ACTION>`.
- Frontend API service added using shared `ApiClient`.
- Frontend hook no longer uses `UnitOfMeasurementMockData` for live state.
- Mock data removed or clearly retained only as import/demo fixture.
- Table behavior remains aligned with Term Management.
- Backend and frontend checks pass.
