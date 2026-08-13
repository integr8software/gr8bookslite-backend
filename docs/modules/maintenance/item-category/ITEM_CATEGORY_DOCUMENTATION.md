# Item Category Documentation

## Purpose

Item Category manages categories used to organize inventory and item masterfile records. Categories can define or inherit accounting setup values and behavior flags used by item setup and inventory posting.

## Architecture

| Layer | File | Responsibility |
| --- | --- | --- |
| Module | `item-category.module.ts` | Registers Prisma, access control, auth, service, and lookup service. |
| Controller | `item-category.controller.ts` | Exposes REST endpoints under `maintenance/item-categories`. |
| Service | `item-category.service.ts` | Handles list, options, create, update, accounting setup resolution, hierarchy behavior, statistics, and validation. |
| Lookup service | `lookups/item-category-lookup.service.ts` | Returns active item category options. |
| DTOs | `dto/*` | Defines create/update and response contracts. |
| Mapper | `mappers/item-category.mapper.ts` | Maps category records and account setup metadata. |
| Utilities | `utils/item-category-accounting.util.ts` | Encapsulates category accounting setup/inheritance behavior. |
| Types | `types/item-category-with-accounts.type.ts` | Defines category relation payloads. |
| Seed | `seed/item-category.seed.ts` | Provides default category data. |

## API Surface

Base path:

```text
/api/v1/maintenance/item-categories
```

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/` | Returns item categories with statistics and permissions. |
| `GET` | `/options` | Returns active item category options. |
| `POST` | `/` | Creates an item category. |
| `PATCH` | `/:id` | Updates an item category. |

## Data Model And Fields

Category fields:

- `id`, `code`, `name`, `description`
- `parentId`
- `accountingSetupMode`
- `accountingSetup`
- `effectiveAccountingSetup`
- account requirement booleans
- `behaviors`
- `inheritedAccountingSourceName`
- `allowSubCategory`
- `status`
- audit fields and usage count

Option response:

```json
{
  "categories": [
    {
      "id": "1",
      "code": "CAT-001",
      "name": "Inventory",
      "description": null,
      "parentId": null,
      "behaviors": ["TRACK_INVENTORY"],
      "allowSubCategory": true,
      "status": "ACTIVE"
    }
  ]
}
```

## Main Workflows

### List

`ItemCategoryService.findAll` loads company-scoped categories, resolves effective accounting setup, computes statistics, and returns permission flags.

### Options

`ItemCategoryLookupService.findOptionsForCompanyUser` returns active categories for item setup screens.

### Create

Create validates category code/name, parent category rules, accounting setup mode, and required accounts before persisting.

### Update

Update applies the same validation while protecting categories that are already used by items or whose subcategory behavior is constrained.

## Validation And Business Rules

- Category names/codes should be unique per company.
- Parent categories must belong to the same company.
- Accounting setup can be explicit or inherited depending on `accountingSetupMode`.
- Required accounts depend on category behaviors.
- Used categories may have restricted changes.

## Permissions And Security

All routes require authenticated access. Company scope and accounting validation are enforced in the service.

## Extension Notes

- Keep accounting inheritance logic in `item-category-accounting.util.ts`.
- Add tests for inherited accounting setup, required account validation, subcategory restrictions, and option output.
