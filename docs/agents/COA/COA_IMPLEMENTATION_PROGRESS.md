# Chart of Accounts Implementation Progress

Date: 2026-06-16

## Status

Chart of Accounts backend Phase 1 is implemented, and the frontend COA screen has been partially wired to the live backend API.

The old frontend mock account seed has been removed. Account code generation is now backend-owned.

## Backend Implemented

Added Prisma models and enums:

- `ChartAccount`
- `BankAccount`
- `ChartAccountLevel`
- `ChartAccountType`
- `AccountNature`
- `ChartAccountStatus`

Added migrations:

- `prisma/migrations/20260616090000_add_chart_of_accounts/migration.sql`
- `prisma/migrations/20260616093000_normalize_chart_account_excel_fields/migration.sql`

Added NestJS module:

```text
src/modules/maintenance/chart-of-accounts/
  chart-of-accounts.module.ts
  chart-of-accounts.controller.ts
  chart-of-accounts.service.ts
  dto/
  mappers/
  prisma/
  types/
  utils/
```

Registered module in:

```text
src/app.module.ts
```

## Backend API

Implemented endpoints:

```http
GET /api/v1/maintenance/chart-of-accounts
GET /api/v1/maintenance/chart-of-accounts/tree
GET /api/v1/maintenance/chart-of-accounts/next-code
GET /api/v1/maintenance/chart-of-accounts/:id
POST /api/v1/maintenance/chart-of-accounts
PATCH /api/v1/maintenance/chart-of-accounts/:id
PATCH /api/v1/maintenance/chart-of-accounts/:id/status
```

## Backend Rules Implemented

- Uses `parentAccountId` for hierarchy.
- Treats `accountCode` as a business identifier only.
- Scopes accounts by active company.
- Generates next account code from backend siblings.
- Fills gaps in the sequence.
- Recalculates account code inside create transaction.
- Prevents duplicate account codes through database unique constraint.
- Supports soft deactivation through status update.
- Returns backend-built tree data.

## Account Code Generation

Implemented utility:

```text
src/modules/maintenance/chart-of-accounts/utils/chart-account-code.util.ts
```

Covered levels:

```text
MAJOR
SUB1
SUB2
SUB3
SPECIFIC
```

Examples supported:

```text
1000000000
1010000000
1010300000
1010301000
1010301001
```

## Frontend Implemented

Removed old COA mock data:

- Deleted `ChartsOfAccountsMockData.ts`
- Deleted unused frontend `ChartsOfAccountsCodeGenerator.ts`
- Removed `MockChartAccounts` usage from the hook

Added live API service:

```text
app/src/services/modules/maintenance/financial-management/charts-of-accounts/
  ChartsOfAccountsApi.ts
  ChartsOfAccountsQueryKeys.ts
```

Updated hook:

```text
app/src/hooks/modules/maintenance/financial-management/charts-of-accounts/useChartsOfAccounts.ts
```

The frontend now:

- Fetches COA tree from backend.
- Saves new accounts through backend.
- Updates accounts through backend.
- Deactivates accounts through backend status endpoint.
- Uses backend `next-code` endpoint for account number generation.

## Frontend Form Updates

Updated the Add/Edit Account drawer:

- Account Number is read-only and generated automatically.
- Parent Account controls available Account Level choices.
- Account Level dropdown supports:
  - `MAJOR`
  - `SUB1`
  - `SUB2`
  - `SUB3`
  - `SPECIFIC`
- Account Type dropdown supports:
  - `ASSET`
  - `LIABILITY`
  - `EQUITY`
  - `REVENUE`
  - `EXPENSE`
- Account Nature dropdown supports:
  - `DEBIT`
  - `CREDIT`
- Added explicit `Posting Account` checkbox.
- Cancel clears the form.
- Clicking outside or X closes/minimizes without clearing the draft.

## Excel Alignment

Updated frontend saving so database fields align better with the provided Excel format.

New saves now map:

```text
account_group:
  MAJOR    -> Major Acct Type
  SUB1     -> Sub Acct 1
  SUB2     -> Sub Acct 2
  SUB3     -> Sub Acct 3
  SPECIFIC -> Specific Acct
```

Statement Section is now limited to:

```text
Balance Sheet
Income Statement
```

This is stored in backend `report_alias`.

Important note:

- Backend `account_type` remains `ASSET`, `LIABILITY`, `EQUITY`, `REVENUE`, or `EXPENSE`.
- Excel's `AccountType` column appears to represent statement grouping, so frontend stores that value in `report_alias`.

## Verification Done

Backend:

- `npm test -- chart-account-code.util.spec.ts --runInBand`
- `npm run db:validate:local`
- `npm run typecheck`
- Targeted ESLint for COA backend files

Frontend:

- Targeted ESLint for changed COA frontend files
- Search confirmed old COA mock references were removed

Known verification note:

- Full frontend `tsc` was blocked by existing `.next/dev/types` references to missing route JS files, unrelated to COA.

## Not Applied Yet

The migrations were created but not applied to the database by Codex:

```text
20260616090000_add_chart_of_accounts
20260616093000_normalize_chart_account_excel_fields
```

Run the project migration workflow before expecting existing DB rows to normalize.

## Remaining Follow-Ups

- Apply Prisma migrations to the target database.
- Confirm whether existing seeded COA rows should be imported from the Excel file directly.
- Add Phase 2 bank account create/update UI and API.
- Add audit logging for create/update/deactivate.
- Add permission-level access beyond company admin checks.
- Add backend service tests for create/update/status flows.
- Add an import tool if the Excel file should become the source of initial COA records.

