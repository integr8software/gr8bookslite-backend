# Payment Type Maintenance Documentation

## Purpose

Payment Type Maintenance manages the company payment methods used by collection, payment, and settlement workflows. Each payment type has a classification, sort order, and active/inactive status so transaction screens can present consistent payment choices.

## Architecture

| Layer | File | Responsibility |
| --- | --- | --- |
| Module | `payment-type-maintenance.module.ts` | Wires Prisma, access control, auth, service, and lookup service. |
| Controller | `payment-type-maintenance.controller.ts` | Exposes REST endpoints under `maintenance/payment-type-maintenance`. |
| Service | `payment-type-maintenance.service.ts` | Handles list, detail, create, update, import, statistics, sort ordering, duplicate checks, and audit-user mapping. |
| Lookup service | `lookups/payment-type-lookup.service.ts` | Returns lightweight payment type options, optionally filtered by classification. |
| DTOs | `dto/*` | Defines create/update/import/list/lookup contracts and response DTOs. |
| Mapper | `mappers/payment-type-maintenance.mapper.ts` | Maps Prisma payment type records into API responses. |
| Seed | `seed/payment-type-maintenance.seed.ts` | Provides default payment type reference data. |

## API Surface

Base path:

```text
/api/v1/maintenance/payment-type-maintenance
```

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/` | Returns paginated payment types with statistics and permissions. |
| `GET` | `/options` | Returns payment type options. |
| `GET` | `/options/:type` | Returns options filtered by classification/type. |
| `GET` | `/:id` | Returns one payment type. |
| `POST` | `/` | Creates a payment type. |
| `POST` | `/import` | Imports multiple payment types. |
| `PATCH` | `/:id` | Updates a payment type. |

## Data Model And Fields

Core fields:

- `id`: public string id.
- `name`: display label for payment selectors.
- `description`: optional details.
- `classification`: Prisma `PaymentTypeClassification`.
- `sortOrder`: numeric order used by selectors and list views.
- `status`: Prisma `PaymentTypeStatus`.
- audit fields: `createdBy`, `createdAt`, `updatedBy`, `updatedAt`.

Option response:

```json
{
  "paymentTypes": [
    {
      "id": "1",
      "name": "Cash",
      "classification": "CASH",
      "sortOrder": 1,
      "status": "ACTIVE"
    }
  ]
}
```

## Main Workflows

### List

`PaymentTypeMaintenanceService.findAll` builds company-scoped filters, applies search, classification/status filters, sort, and pagination, then returns payment types with statistics and permission flags.

### Options

`PaymentTypeLookupService.findOptionsForCompanyUser` returns active/selectable payment types. The controller also supports `options/:type`, which normalizes the route parameter and applies it as a classification filter.

### Create And Update

The service validates name uniqueness within the active company. Create assigns the next sort order when needed. Update loads the existing row by company and id, validates any changed name, and applies the update DTO.

### Import

Import validates duplicate names inside the payload and against existing company data before creating rows.

## Validation And Business Rules

- Names are unique per company.
- Import names must be unique within the file/payload.
- Classification values must match the Prisma enum.
- Sort order is maintained server-side so selectors can display stable ordering.

## Permissions And Security

All endpoints require bearer authentication. Normal operations resolve the active company from `AuthUser`; callers must not submit a company id. Response permissions should drive frontend action visibility.

## Extension Notes

- Add new payment classifications in Prisma and update seed/default data together.
- Keep `options/:type` aligned with `PaymentTypeLookupQueryDto`.
- Add tests for classification filtering, duplicate validation, import validation, and sort-order behavior.
