# Services Maintenance Documentation

## Purpose

Services Maintenance manages service masterfile records and their revenue-account setup. Service records are used by billing, sales, and financial modules that need selectable service items with consistent accounting behavior.

## Architecture

| Layer | File | Responsibility |
| --- | --- | --- |
| Module | `services-maintenance.module.ts` | Registers Prisma, access control, auth, service, and lookup service. |
| Controller | `services-maintenance.controller.ts` | Exposes REST endpoints under `maintenance/financial-management/services-maintenance`. |
| Service | `services-maintenance.service.ts` | Handles list, options, account options, next account code, detail, create, update, status update, account validation, and statistics. |
| Lookup service | `lookups/services-lookup.service.ts` | Provides service selector options and revenue account options. |
| DTOs | `dto/*` | Defines create/update/status/list and response contracts. |
| Mapper | `mappers/service-maintenance.mapper.ts` | Maps service rows and audit-user information. |
| Utilities | `utils/*` | Encapsulates service account and service data helpers. |
| Prisma include | `prisma/service-maintenance.include.ts` | Centralizes chart account includes. |
| Seed | `seed/services-maintenance.seed.ts` | Provides default service data. |

## API Surface

Base path:

```text
/api/v1/maintenance/financial-management/services-maintenance
```

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/` | Returns services with statistics, pagination, and permissions. |
| `GET` | `/options` | Returns service options. |
| `GET` | `/account-options` | Returns revenue account options for service setup. |
| `GET` | `/next-account-code` | Suggests the next service revenue account code. |
| `GET` | `/:id` | Returns one service record. |
| `POST` | `/` | Creates a service. |
| `PATCH` | `/:id` | Updates a service. |
| `PATCH` | `/:id/status` | Updates service status. |

## Data Model And Fields

Core fields:

- `id`
- `serviceName`
- `description`
- `status`
- `accountSetupMode`
- `revenueCoaId`
- `revenueAccountCode`
- `revenueAccountTitle`
- `isGeneratedRevenueAccount`
- audit fields

Option response:

```json
{
  "services": [
    {
      "id": "1",
      "serviceName": "Consulting",
      "name": "Consulting",
      "status": "ACTIVE"
    }
  ]
}
```

## Main Workflows

### List

`ServicesMaintenanceService.findAll` applies company-scoped filtering, includes revenue account data, computes service statistics, maps audit users, and returns permissions.

### Options

`ServicesLookupService.findOptionsForCompanyUser` returns active service options for transaction forms. `findAccountOptionsForCompanyUser` returns chart accounts valid for service revenue setup.

### Next Account Code

`getNextAccountCode` returns the next generated revenue account code under the configured service revenue parent.

### Create And Update

Create/update validate service name, selected revenue account, account setup mode, and generated account behavior before writing. Generated revenue accounts are coordinated by the service helpers.

### Status Update

Status updates toggle availability without removing service records or generated account history.

## Validation And Business Rules

- Service names are unique per company.
- Selected revenue accounts must be valid for the company and service setup.
- Generated account codes must be created under the expected parent account.
- Inactive services should not appear in selector options.

## Permissions And Security

All routes require authenticated access. Company id comes from the current user. Service/account validation should not be moved to the client because it protects financial posting behavior.

## Extension Notes

- Keep account setup behavior in utilities and service helpers.
- Add tests for account option filtering, next-code generation, generated account creation, and status updates.
