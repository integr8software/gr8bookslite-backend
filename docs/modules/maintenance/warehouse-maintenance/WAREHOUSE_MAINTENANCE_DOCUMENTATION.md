# Warehouse Maintenance Documentation

## Purpose

Warehouse Maintenance manages company warehouse definitions and their branch availability. It provides the canonical warehouse list used by inventory, stock movement, warehouse access, and transaction modules.

## Architecture

| Layer | File | Responsibility |
| --- | --- | --- |
| Module | `warehouse-maintenance.module.ts` | Registers Prisma, access control, auth, main service, and lookup service. |
| Controller | `warehouse-maintenance.controller.ts` | Exposes REST endpoints under `maintenance/warehouse-maintenance`. |
| Service | `warehouse-maintenance.service.ts` | Handles list, detail, create, update, statistics, branch resolution, code generation, and duplicate validation. |
| Lookup service | `lookups/warehouse-lookup.service.ts` | Returns active warehouse options and ensures default rows when needed. |
| DTOs | `dto/*` | Defines create/update/list/lookup and response contracts. |
| Mapper | `mappers/warehouse-maintenance.mapper.ts` | Maps warehouse records and branch relations into API responses. |
| Prisma include | `prisma/warehouse-maintenance.include.ts` | Centralizes relation includes. |
| Seed | `seed/warehouse-maintenance.seed.ts` | Provides default warehouse data. |

## API Surface

Base path:

```text
/api/v1/maintenance/warehouse-maintenance
```

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/` | Returns warehouses with statistics, pagination, and permissions. |
| `GET` | `/options` | Returns selectable warehouses. |
| `GET` | `/:id` | Returns one warehouse. |
| `POST` | `/` | Creates a warehouse. |
| `PATCH` | `/:id` | Updates a warehouse. |

## Data Model And Fields

Core fields:

- `id`, `code`, `name`
- `branchUnitIds`
- `branchAvailabilityMode`
- `branches`
- `managerName`
- `status`
- `address`, `contactNo`, `description`
- audit fields

Option response:

```json
{
  "warehouses": [
    {
      "id": "1",
      "code": "WH-001",
      "name": "Main Warehouse",
      "status": "ACTIVE"
    }
  ]
}
```

## Main Workflows

### List

`WarehouseMaintenanceService.findAll` resolves company access, ensures required default rows, builds branch-aware filters, includes branch relations, computes statistics, maps audit users, and returns a list response.

### Options

`WarehouseLookupService.findOptionsForCompanyUser` returns active warehouse options. It supports `search` and `branchUnitId` filtering so branch-scoped forms only show valid warehouses.

### Create

Create resolves branch unit ids according to `branchAvailabilityMode`, generates or validates warehouse codes, enforces unique names/codes, and writes branch relations in a transaction.

### Update

Update loads the existing warehouse by company and id, validates code changes, resolves branch relations, and updates the record with its branch assignments.

## Validation And Business Rules

- Warehouse names and codes are unique per company.
- Branch assignments must belong to the active company.
- Branch availability mode controls whether branch ids are required, ignored, or expanded.
- Default rows may be created or ensured before list/lookup results.

## Permissions And Security

All routes require `JwtAuthGuard`. Company scope is resolved from the current user and not accepted from clients. Permission flags are returned in list/detail responses.

## Extension Notes

- Add branch-related behavior in one place inside branch resolution helpers.
- Keep code generation deterministic and collision-safe.
- Add tests for branch filtering, code uniqueness, and update behavior when modifying this module.
