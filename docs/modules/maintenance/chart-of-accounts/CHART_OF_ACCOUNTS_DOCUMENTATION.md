# Chart Of Accounts Documentation

## Purpose

Chart of Accounts is the core financial account masterfile. It defines account hierarchy, account codes, posting behavior, account type/nature, bank-link metadata, and active/inactive status used throughout accounting modules.

## Architecture

| Layer | File | Responsibility |
| --- | --- | --- |
| Module | `chart-of-accounts.module.ts` | Registers Prisma, access control, auth, main service, lookup service, and bank sync service. |
| Controller | `chart-of-accounts.controller.ts` | Exposes REST endpoints under `maintenance/chart-of-accounts`. |
| Service | `chart-of-accounts.service.ts` | Handles list, tree, detail, create, update, status update, next-code generation, and account validation. |
| Lookup service | `lookups/chart-of-accounts-lookup.service.ts` | Returns account options, posting account options, and all-account options. |
| Bank sync service | `services/chart-account-bank-sync.service.ts` | Synchronizes status-sensitive relationships between chart accounts and bank accounts. |
| DTOs | `dto/*` | Defines create/update/status/list/next-code and response contracts. |
| Mapper | `mappers/chart-account.mapper.ts` | Maps chart account rows and related bank accounts into API response shapes. |
| Utilities | `utils/*` | Encapsulates account-code parsing/generation and system account group defaults. |
| Prisma include | `prisma/chart-account.include.ts` | Centralizes bank-account relation includes. |
| Seed | `seed/*` | Seeds default accounts and system account groups. |

## API Surface

Base path:

```text
/api/v1/maintenance/chart-of-accounts
```

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/` | Returns chart accounts. |
| `GET` | `/options` | Returns account options. |
| `GET` | `/options/posting-accounts` | Returns posting-account options only. |
| `GET` | `/options/all-accounts` | Returns all account options. |
| `GET` | `/tree` | Returns hierarchical chart account tree. |
| `GET` | `/next-code` | Suggests the next account code from query context. |
| `GET` | `/:id` | Returns one chart account. |
| `POST` | `/` | Creates a chart account. |
| `PATCH` | `/:id` | Updates a chart account. |
| `PATCH` | `/:id/status` | Updates chart account status. |

## Data Model And Fields

Core fields:

- `id`, `companyId`, `parentAccountId`
- `accountCode`, `accountTitle`
- `accountLevel`, `accountType`, `accountNature`
- `accountGroup`, `statementSection`, `reportAlias`
- `isPostingAccount`, `withSubsidiary`, `contraAccount`, `showTotal`
- `orderNo`, `status`, `currencyCode`
- `isSystemDefault`, `isUserCreated`, `isBankLinked`
- `bankAccounts`
- audit/deletion fields

Option response:

```json
{
  "accounts": [
    {
      "id": "1",
      "accountCode": "1000",
      "accountTitle": "Cash",
      "accountType": "ASSET",
      "accountNature": "DEBIT",
      "status": "ACTIVE"
    }
  ]
}
```

## Main Workflows

### List And Tree

List returns flat account rows for management screens. Tree loads accounts and organizes them by `parentAccountId`, allowing frontend chart-account browsers to render hierarchy.

### Options

The lookup service exposes three selector modes:

- `options`: standard account options.
- `options/posting-accounts`: only posting accounts suitable for transactions.
- `options/all-accounts`: all accounts, including non-posting parents.

### Next Code

`findNextCode` uses query context and account-code utilities to suggest the next valid child code under a parent or group.

### Create And Update

The service validates parent-child rules, account-code uniqueness, posting behavior, account hierarchy, and system-account restrictions before writing changes.

### Status Update

Status updates protect system/bank-linked behavior and coordinate with bank-account sync where required.

## Validation And Business Rules

- Account codes must be unique per company.
- Parent-child relationships must preserve valid hierarchy.
- Posting account rules must remain consistent with account level and child accounts.
- System default accounts require stricter handling than user-created accounts.
- Bank-linked accounts must remain compatible with bank masterfile status rules.

## Permissions And Security

All endpoints require bearer authentication. All service operations are company-scoped through the current user. The chart of accounts is high-impact financial data, so validation should remain service-side.

## Extension Notes

- Reuse account-code utilities instead of duplicating string parsing.
- Keep bank-sync side effects in `ChartAccountBankSyncService`.
- Add tests for code generation, hierarchy validation, status updates, and posting-account lookup behavior.
