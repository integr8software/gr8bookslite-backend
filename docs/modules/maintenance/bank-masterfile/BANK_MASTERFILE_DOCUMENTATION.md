# Bank Masterfile Documentation

## Purpose

Bank Masterfile manages company bank accounts and their linked chart accounts. It supports bank account maintenance, default bank setup, account-code generation, import, status updates, and lightweight bank options for forms that need a cash/bank selector.

## Architecture

| Layer | File | Responsibility |
| --- | --- | --- |
| Module | `bank-masterfile.module.ts` | Registers Prisma, access control, auth, bank services, lookup service, and chart-account bank sync support. |
| Controller | `bank-masterfile.controller.ts` | Exposes REST endpoints under `maintenance/financial-management/bank-masterfile`. |
| Service | `bank-masterfile.service.ts` | Handles list, detail, create, update, import, status changes, and next-code orchestration. |
| Support service | `services/bank-masterfile-support.service.ts` | Encapsulates statistics, cash-in-bank parent lookup, account-code generation, account-code validation, duplicate validation, and import validation. |
| Lookup service | `lookups/bank-masterfile-lookup.service.ts` | Returns selectable bank account options with masked account numbers. |
| Chart account sync | `../chart-of-accounts/services/chart-account-bank-sync.service.ts` | Keeps bank-account status and linked chart-account status in sync. |
| DTOs | `dto/*` | Defines create/update/import/status/list and response contracts. |
| Mapper | `mappers/bank-account.mapper.ts` | Maps bank account rows and audit users into API responses. |
| Prisma include | `prisma/bank-account.include.ts` | Centralizes chart account relation includes. |
| Seed | `seed/bank-masterfile.seed.ts` | Provides default bank data when provisioning. |

## API Surface

Base path:

```text
/api/v1/maintenance/financial-management/bank-masterfile
```

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/` | Returns bank accounts with statistics, pagination, and permissions. |
| `GET` | `/options` | Returns bank options for selectors. |
| `GET` | `/next-account-code` | Suggests the next bank chart account code. |
| `GET` | `/:id` | Returns one bank account. |
| `POST` | `/` | Creates a bank account and linked chart account behavior. |
| `POST` | `/import` | Imports bank accounts. |
| `PATCH` | `/:id` | Updates one bank account. |
| `PATCH` | `/:id/status` | Updates bank status and syncs related account state. |

## Data Model And Fields

Bank account responses include:

- `id`, `companyId`, `coaId`
- `accountCode`
- `bankName`, `branch`, `accountNumber`, `accountName`, `accountType`
- check series fields: `seriesStart`, `seriesEnd`, `seriesDigits`
- `currencyCode`, `isDefault`, `status`
- linked `chartAccount`
- audit fields

Option response:

```json
{
  "banks": [
    {
      "id": "1",
      "bankName": "Sample Bank",
      "accountName": "Operating Account",
      "maskedAccountNumber": "****1234",
      "currencyCode": "PHP",
      "status": "ACTIVE"
    }
  ]
}
```

## Main Workflows

### List

`BankMasterfileService.findAll` resolves company access, applies filters, includes chart account data, fetches statistics from `BankMasterfileSupportService`, maps audit users, and returns pagination plus permissions.

### Options

`BankMasterfileLookupService.findOptionsForCompanyUser` returns lightweight bank options. It supports search and currency filtering and masks account numbers before returning data.

### Next Account Code

`getNextAccountCode` finds the active Cash in Bank parent account and generates the next child account code. This keeps bank-created accounts under the proper financial-management account group.

### Create And Update

Create and update validate bank/account uniqueness, validate manual account codes when supplied, and coordinate the bank record with its chart account relationship. Status updates use the chart account sync service so bank visibility and accounting status do not drift.

### Import

Import validates all incoming bank rows for duplicate account details and account-code conflicts before insertion.

## Validation And Business Rules

- Bank account identity must be unique within the company.
- Manual account codes must be valid under the expected Cash in Bank parent.
- Account numbers are masked in option responses.
- Status changes must stay synchronized with linked chart accounts.
- Imports validate duplicates before writing.

## Permissions And Security

All routes are authenticated and company-scoped. Account number masking is part of the lookup response boundary and should not be bypassed by UI code.

## Extension Notes

- Keep bank-account/chart-account synchronization in the sync/support services rather than duplicating it in the controller.
- Add tests around account-code generation, masking, duplicate import validation, and status sync before changing this module.
