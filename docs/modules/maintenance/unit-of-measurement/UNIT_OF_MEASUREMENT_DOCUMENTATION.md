# Unit Of Measurement Documentation

## Purpose

The Unit of Measurement module maintains the company-specific units used by inventory, purchasing, sales, and service flows. Units define a display name, symbol, quantity mode, and status.

## Architecture

| Layer | File | Responsibility |
| --- | --- | --- |
| Module | `unit-of-measurement.module.ts` | Registers service and lookup service with Prisma, access control, and auth dependencies. |
| Controller | `unit-of-measurement.controller.ts` | Exposes authenticated REST endpoints under `maintenance/unit-of-measurement`. |
| Service | `unit-of-measurement.service.ts` | Handles CRUD, import, list filtering, statistics, duplicate validation, and audit-user mapping. |
| Lookup service | `lookups/unit-of-measurement-lookup.service.ts` | Provides lightweight unit options for forms. |
| DTOs | `dto/*` | Defines list, lookup, create, update, import, and response contracts. |
| Mapper | `mappers/unit-of-measurement.mapper.ts` | Maps Prisma rows to DTOs. |
| Seed | `seed/unit-of-measurement.seed.ts` | Provides default unit reference data. |

## API Surface

Base path:

```text
/api/v1/maintenance/unit-of-measurement
```

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/` | Returns units with statistics, pagination, and permissions. |
| `GET` | `/options` | Returns selectable unit options. |
| `GET` | `/:id` | Returns one unit. |
| `POST` | `/` | Creates a unit. |
| `POST` | `/import` | Imports multiple units. |
| `PATCH` | `/:id` | Updates a unit. |

## Data Model And Fields

Core fields:

- `id`
- `name`
- `symbol`
- `quantityMode`
- `status`
- audit fields

Option response:

```json
{
  "units": [
    {
      "id": "1",
      "name": "Piece",
      "symbol": "pc",
      "quantityMode": "WHOLE",
      "status": "ACTIVE"
    }
  ]
}
```

## Main Workflows

### List

`UnitOfMeasurementService.findAll` resolves company access, builds query filters, sorts rows, computes unit statistics, maps audit users, and returns a list response.

### Options

`UnitOfMeasurementLookupService.findOptionsForCompanyUser` returns selector-safe unit data. It supports lookup filters such as `search` and `quantityMode`.

### Create And Update

The service normalizes symbols, validates unique names and symbols per company, and persists allowed DTO fields. Update loads the target unit by company and id before applying changes.

### Import

Import uses the create DTO shape for each row and rejects duplicate names or symbols in the payload and against existing rows.

## Validation And Business Rules

- `name` must be unique per company.
- `symbol` must be unique per company and is normalized server-side.
- `quantityMode` must match the Prisma enum.
- Imports must not contain duplicate names or duplicate symbols.

## Permissions And Security

All endpoints require authenticated access. Company id is derived from the current user. Permissions are returned in list/detail containers for UI gating.

## Extension Notes

- When adding quantity modes, update Prisma enum usage, seed data, and frontend display mappings.
- Keep option payloads short because units are loaded frequently by item and transaction forms.
- Add tests for duplicate names, duplicate symbols, symbol normalization, and lookup filtering.
