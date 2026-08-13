# Discount Maintenance Documentation

## Purpose

Discount Maintenance manages reusable purchase and sales discounts. A discount defines its type, value type, numeric value, status, and the chart account used for accounting entries.

## Architecture

| Layer | File | Responsibility |
| --- | --- | --- |
| Module | `discount-maintenance.module.ts` | Registers Prisma, access control, auth, main service, and lookup service. |
| Controller | `discount-maintenance.controller.ts` | Exposes REST endpoints under `maintenance/discount-maintenance`. |
| Service | `discount-maintenance.service.ts` | Handles list, detail, create, update, import, statistics, value validation, chart account validation, and audit-user mapping. |
| Lookup service | `lookups/discount-lookup.service.ts` | Returns selectable discounts filtered by type and/or value type. |
| DTOs | `dto/*` | Defines list, lookup, create, update, import, and response contracts. |
| Mapper | `mappers/discount-maintenance.mapper.ts` | Maps discount rows and account relations into API responses. |
| Utilities | `utils/discount-chart-account.util.ts` | Encapsulates chart-account related discount rules. |
| Seed | `seed/discount-maintenance.seed.ts` | Provides default discounts. |

## API Surface

Base path:

```text
/api/v1/maintenance/discount-maintenance
```

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/` | Returns discounts with statistics, pagination, and permissions. |
| `GET` | `/options` | Returns discount options. |
| `GET` | `/options/:type` | Returns options filtered by discount type. |
| `GET` | `/:id` | Returns one discount. |
| `POST` | `/` | Creates a discount. |
| `POST` | `/import` | Imports multiple discounts. |
| `PATCH` | `/:id` | Updates a discount. |

## Data Model And Fields

Core fields:

- `id`, `name`, `description`
- `type`: purchase/sales discount classification.
- `valueType`: fixed amount or percentage behavior.
- `value`: stored value returned as string in responses.
- `status`
- `chartAccountId`, `accountCode`, `accountTitle`, `accountGroupPath`
- audit fields

Option response:

```json
{
  "discounts": [
    {
      "id": "1",
      "name": "Sales Discount 5%",
      "type": "SALES",
      "valueType": "PERCENTAGE",
      "value": "5",
      "status": "ACTIVE"
    }
  ]
}
```

## Main Workflows

### List

`DiscountMaintenanceService.findAll` builds a company-scoped query with search/type/value-type/status filters, includes the chart account relation, computes statistics, and maps audit users.

### Options

`DiscountLookupService.findOptionsForCompanyUser` returns active discount options for transaction forms. Use `options/:type` when a form only allows purchase or sales discounts.

### Create And Update

The service validates the discount name, value, selected chart account, and uniqueness before writing. Update loads the existing company record and validates changed fields before saving.

### Import

Import validates duplicate names in the payload, discount values, and account mappings before inserting records.

## Validation And Business Rules

- Discount names are unique per company.
- Percentage discounts must be valid percentages.
- The selected chart account must be valid for the discount setup.
- Imports cannot contain duplicate discount names.

## Permissions And Security

All endpoints require bearer authentication and derive company scope from `AuthUser`. List/detail responses include permission flags for UI action control.

## Extension Notes

- Keep accounting validation in utility functions when adding new discount types.
- Add tests for value validation and account validation before changing persistence logic.
- Update lookup documentation when new filters are added to `DiscountLookupQueryDto`.
