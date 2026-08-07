# Party Maintenance Documentation

## Purpose

Party Maintenance manages company parties such as customers, suppliers, employees, and other external or internal counterparties. It stores party identity, contact details, addresses, party type, status, and accounting account mappings used by transaction modules.

## Architecture

| Layer | File | Responsibility |
| --- | --- | --- |
| Module | `party-maintenance.module.ts` | Registers Prisma, access control, auth, address module, service, and lookup service. |
| Controller | `party-maintenance.controller.ts` | Exposes REST endpoints under `maintenance/party-maintenance`. |
| Service | `party-maintenance.service.ts` | Handles list, detail, create, update, import, address resolution, accounting mappings, statistics, validation, and audit-user mapping. |
| Lookup service | `lookups/party-lookup.service.ts` | Returns party options and accounting account options. |
| DTOs | `dto/*` | Defines create/update/address/import/list/options and response contracts. |
| Mapper | `mappers/party-maintenance.mapper.ts` | Maps party rows and nested relations to response DTOs. |
| Utilities | `utils/party-accounting-account.util.ts` | Builds party accounting account option groups and mappings. |
| Prisma include | `prisma/party.include.ts` | Centralizes party detail relation includes. |
| Types | `types/*` | Defines party and accounting payload relation types. |

## API Surface

Base path:

```text
/api/v1/maintenance/party-maintenance
```

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/` | Returns parties with statistics, pagination, and permissions. |
| `GET` | `/accounting-options` | Returns accounting account options for party setup. |
| `GET` | `/options` | Returns party options. |
| `GET` | `/options/:partyType` | Returns party options filtered by type. |
| `GET` | `/:id` | Returns one party with details. |
| `POST` | `/` | Creates a party. |
| `POST` | `/import` | Imports parties. |
| `PATCH` | `/:id` | Updates a party. |

## Data Model And Fields

Party responses include:

- party code/number, registered name, trade name, and type
- contact details and tax/registration details
- status and classification fields
- addresses
- accounting account summaries
- audit fields

Party option responses are richer than simple selectors because transaction forms may need contact, address, and accounting metadata.

## Main Workflows

### List

`PartyMaintenanceService.findAll` applies company-scoped filters for search, type, status, and other list query values, includes party relations, computes statistics, maps audit users, and returns permissions.

### Options

`PartyLookupService.findOptionsForCompanyUser` returns party options for selectors. `options/:partyType` applies a type filter from the route. The lookup service keeps option loading independent from full list pagination.

### Accounting Options

`findAccountingOptionsForCompanyUser` returns grouped chart account options used when configuring party accounting accounts such as receivable, payable, advances, or other party-related postings.

### Create And Update

The service normalizes party input, validates required fields, optionally resolves address names, enforces party code rules, validates accounting accounts, and writes party details.

### Import

Import supports bulk party creation while applying duplicate checks, address/account normalization, and validation rules.

## Validation And Business Rules

- Party data is company-scoped.
- Party code behavior can be required depending on options.
- Party names/codes must avoid duplicates according to service rules.
- Accounting accounts must be valid posting descendants of expected parent accounts.
- Address names may be resolved through the address module.

## Permissions And Security

All endpoints require bearer authentication. Company scope is derived from the user. Because party records feed financial transactions, accounting account validation must remain server-side.

## Extension Notes

- Keep accounting option logic in `party-accounting-account.util.ts`.
- Add tests for party-type option filtering, accounting option grouping, duplicate validation, and address resolution when extending the module.
