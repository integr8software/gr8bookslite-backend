# Item Variations Documentation

## Purpose

Item Variations manages item attributes such as color, size, style, or other configurable item dimensions. Each variation can contain multiple values and flags that describe how it affects item creation and stock behavior.

## Architecture

| Layer | File | Responsibility |
| --- | --- | --- |
| Module | `item-variations.module.ts` | Registers Prisma, access control, auth, service, and lookup service. |
| Controller | `item-variations.controller.ts` | Exposes REST endpoints under `maintenance/item-variations`. |
| Service | `item-variations.service.ts` | Handles list, options, create, update, statistics, code generation, value synchronization, duplicate validation, and audit-user mapping. |
| Lookup service | `lookups/item-variations-lookup.service.ts` | Returns active variations and active values for selectors. |
| DTOs | `dto/*` | Defines create/update/value contracts. |
| Mapper | `mappers/item-variation.mapper.ts` | Maps item attribute records and values to API responses. |
| Types | `types/item-variation-with-values.type.ts` | Defines relation payloads used by service and mapper code. |
| Seed | `seed/item-variations.seed.ts` | Provides default variation data. |

## API Surface

Base path:

```text
/api/v1/maintenance/item-variations
```

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/` | Returns item variations and values. |
| `GET` | `/options` | Returns active variation options with active values. |
| `POST` | `/` | Creates a variation and its values. |
| `PATCH` | `/:id` | Updates a variation and synchronizes values. |

## Data Model And Fields

Variation fields include:

- `id`, `code`, `name`
- `usage`
- `requiredOnItem`
- `affectsStock`
- `status`
- `values`

Value fields include:

- `id`
- `label`
- `isUsed`
- `sortOrder`
- `status`

Option response:

```json
{
  "variations": [
    {
      "id": "1",
      "code": "VAR-001",
      "name": "Color",
      "usage": "ITEM",
      "requiredOnItem": true,
      "affectsStock": true,
      "status": "ACTIVE",
      "values": [
        {
          "id": "10",
          "label": "Red",
          "isUsed": false,
          "status": "ACTIVE"
        }
      ]
    }
  ]
}
```

## Main Workflows

### List

`ItemVariationsService.findAll` loads company-scoped variations with values, maps audit users, and returns statistics for the item variation maintenance screen.

### Options

`ItemVariationsLookupService.findOptionsForCompanyUser` returns only active variations and active values. Use this for item setup forms.

### Create

Create validates variation name uniqueness, value label uniqueness, generates the next code, and creates variation values in sorted order.

### Update And Value Sync

Update loads the existing variation and synchronizes values. The service updates existing values, creates new values, and protects values marked as used from unsafe removal or invalid changes.

## Validation And Business Rules

- Variation names are unique per company.
- Value labels must be unique within a variation payload.
- Used values are protected by `ensureUsedValuesRemain`.
- Codes are generated server-side.
- Lookup returns active records only.

## Permissions And Security

All routes require authenticated access and company scope is derived from the current user. Option consumers should not expose inactive values for item assignment.

## Extension Notes

- Keep value synchronization transactional.
- Add tests before changing used-value protection.
- See `docs/agents/modules/item-variations/ITEM_VARIATIONS_BACKEND_INTEGRATION.md` for broader integration context.
