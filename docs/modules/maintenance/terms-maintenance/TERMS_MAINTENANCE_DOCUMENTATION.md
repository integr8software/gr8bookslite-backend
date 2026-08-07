# Terms Maintenance Documentation

## Purpose

Terms Maintenance manages company-specific payment or credit terms. A term defines the date basis (`dateMode`) and period used by transaction modules when calculating due dates, aging, and settlement windows.

This module is used wherever the system needs a reusable term selector or needs to maintain the canonical list of terms for a company.

## Architecture

| Layer | File | Responsibility |
| --- | --- | --- |
| Module | `terms-maintenance.module.ts` | Registers the service and lookup service with Prisma, access control, and authentication dependencies. |
| Controller | `terms-maintenance.controller.ts` | Exposes authenticated REST endpoints under `maintenance/terms-maintenance`. |
| Service | `terms-maintenance.service.ts` | Handles listing, detail retrieval, create, update, import, statistics, duplicate validation, and audit-user mapping. |
| Lookup service | `lookups/terms-lookup.service.ts` | Provides lightweight active term options for selectors and other modules. |
| DTOs | `dto/*` | Defines create/update/import/list/lookup contracts and response shapes. |
| Mapper | `mappers/terms-maintenance.mapper.ts` | Converts Prisma rows into API response DTOs. |
| Seed | `seed/terms-maintenance.seed.ts` | Provides default/reference terms during provisioning or seed flows. |

## API Surface

Base path:

```text
/api/v1/maintenance/terms-maintenance
```

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/` | Returns a paginated list with statistics, pagination, and permissions. |
| `GET` | `/options` | Returns reusable term options for dropdowns/autocomplete. |
| `GET` | `/:id` | Returns a single term container. |
| `POST` | `/` | Creates one term. |
| `POST` | `/import` | Imports multiple terms. |
| `PATCH` | `/:id` | Updates one term. |

## Data Model And Fields

Core term fields:

- `id`: public string form of the term id.
- `name`: unique display name per company.
- `description`: optional explanatory text.
- `dateMode`: Prisma `TermDateMode`; used with `period` to calculate dates.
- `period`: numeric term duration.
- `status`: Prisma `TermStatus`.
- `createdBy`, `createdAt`, `updatedBy`, `updatedAt`: audit metadata.

Option response shape:

```json
{
  "terms": [
    {
      "id": "1",
      "name": "30 Days",
      "dateMode": "DAY",
      "period": 30,
      "status": "ACTIVE"
    }
  ]
}
```

## Main Workflows

### List

`TermsMaintenanceService.findAll` resolves the active company from the authenticated user, builds a company-scoped Prisma filter, applies search/filter/sort/pagination query DTO values, maps audit users, and returns:

- `terms`
- `statistics`
- `pagination`
- `permissions`

### Options

`TermsLookupService.findOptionsForCompanyUser` resolves and verifies company access, then returns active/selectable term rows. Use this endpoint for transaction forms instead of loading the full list endpoint.

### Create And Update

Create and update paths normalize DTO input, enforce company scope, check duplicate names, and persist only whitelisted DTO fields. Update first loads the target term by company and id, then applies allowed changes.

### Import

Import accepts multiple create DTOs. The service rejects duplicate names within the import payload and also checks existing company records before inserting rows.

## Validation And Business Rules

- A term name must be unique inside the active company.
- Imports cannot contain duplicate names in the same request.
- All queries are company-scoped through the authenticated user.
- Lookup options should remain lightweight and should not include list-only metadata such as pagination or statistics.

## Permissions And Security

The controller uses `JwtAuthGuard` and bearer auth. The service composes permissions in response DTOs so clients can decide which UI actions to show. Access should remain company-scoped and should never accept a client-supplied company id for normal CRUD or lookup operations.

## Extension Notes

- Add new filters to both `GetTermListQueryDto` and `TermLookupQueryDto` only when selectors and list screens both need them.
- Keep `terms-lookup.service.ts` focused on selector payloads.
- Add tests for controller delegation, company scoping, duplicate validation, and import duplicate handling when changing behavior.
