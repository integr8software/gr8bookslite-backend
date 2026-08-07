# Default Account Documentation

## Purpose

Default Account manages reusable account templates for generated expense and collection accounts. It helps standardize how the system creates or maps chart accounts for operational features that need financial posting defaults.

## Architecture

| Layer | File | Responsibility |
| --- | --- | --- |
| Module | `default-account.module.ts` | Registers Prisma, access control, auth, main service, and lookup service. |
| Controller | `default-account.controller.ts` | Exposes REST endpoints under `maintenance/financial-management/default-accounts`. |
| Service | `default-account.service.ts` | Handles list, detail, options, expense parent options, create, update, status update, expense sub-account creation, account mapping, and validation. |
| Lookup service | `lookups/default-account-lookup.service.ts` | Returns default-account options and expense parent options for selectors. |
| DTOs | `dto/*` | Defines template create/update/status/list/options and response contracts. |
| Mapper | `mappers/default-account-template.mapper.ts` | Maps templates and generated accounts to API responses. |
| Prisma include | `prisma/default-account-template.include.ts` | Centralizes generated-account relation includes. |
| Seed | `seed/*` | Seeds default account templates and defaults. |

## API Surface

Base path:

```text
/api/v1/maintenance/financial-management/default-accounts
```

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/` | Returns default account templates with statistics, pagination, and permissions. |
| `GET` | `/options` | Returns all default account options. |
| `GET` | `/options/:type` | Returns expense or collection options. |
| `GET` | `/expense-parent-options` | Returns allowed parent accounts for expense template generation. |
| `POST` | `/expense-sub-accounts` | Creates an expense sub-account under an allowed parent. |
| `GET` | `/:id` | Returns one default account template. |
| `POST` | `/` | Creates a default account template. |
| `PATCH` | `/:id` | Updates a template. |
| `PATCH` | `/:id/status` | Updates template status. |

## Data Model And Fields

Template fields:

- `id`, `companyId`
- `type`: `EXPENSE` or `COLLECTION`
- `defaultAccountName`
- `description`
- `status`
- `expenseParentCoaId`
- `generatedAccounts`
- audit fields

Option fields include template identity plus mapped chart account data:

- `chartAccountId`
- `accountCode`
- `accountTitle`
- `accountType`
- `accountNature`

## Main Workflows

### List

`DefaultAccountService.findAll` applies company-scoped filtering, type/status/search queries, generated-account includes, statistics, pagination, audit-user mapping, and permission output.

### Options

Options are available for all templates or filtered by `expense`/`collection`. The controller normalizes `options/:type` and rejects unsupported values with `BadRequestException`.

### Expense Parent Options

Expense parent options restrict where generated expense sub-accounts can be created. This protects the chart of accounts hierarchy from invalid template placement.

### Create Expense Sub-Account

`createExpenseSubAccount` accepts a chart-account create DTO and creates a sub-account under a valid expense parent. This is a specialized bridge from default-account setup into chart-account creation.

### Create And Update Template

The service validates template type, default account name, mapped parent accounts, generated chart-account title availability, and duplicate template names before writing.

### Status Update

Status updates change template availability without deleting generated account history.

## Validation And Business Rules

- Supported template types are expense and collection.
- Template names/descriptions must be unique enough to prevent duplicate generated account labels.
- Expense parent accounts must be valid parent accounts in the active company.
- Generated account titles must not conflict under the same parent.
- The service protects mapped parent account roles such as expense parent and revenue parent.

## Permissions And Security

All routes require bearer auth. Company scope is resolved server-side. Because this module creates or maps chart accounts, validation should remain centralized in the service.

## Extension Notes

- Keep template type normalization in controller/service boundaries.
- Add tests for expense parent validation, generated account creation, duplicate title validation, and type-specific options.
