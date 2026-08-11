# Accounts Payable Voucher Implementation Reference

This document describes the implemented Accounts Payable Voucher module across
the backend and frontend. It replaces the older integration plan; use it as the
current reference when maintaining APV behavior.

Primary source locations:

```text
gr8bookslite-backend/src/modules/accounts-payable/accounts-payable-voucher/
gr8bookslite-backend/prisma/schema.prisma
gr8bookslite-frontend/app/(modules)/accounts-payable/accounts-payable-voucher/
gr8bookslite-frontend/app/src/ui/modules/accounts-payable/accounts-payable-voucher/
gr8bookslite-frontend/app/src/hooks/modules/accounts-payable/accounts-payable-voucher/
gr8bookslite-frontend/app/src/services/modules/accounts-payable/accounts-payable-voucher/
gr8bookslite-frontend/app/src/types/modules/accounts-payable/accounts-payable-voucher/
gr8bookslite-frontend/app/src/data/modules/accounts-payable/accounts-payable-voucher/
```

Related guides:

```text
gr8bookslite-backend/docs/agents/guides/BACKEND_INTEGRATION_GUIDE.md
gr8bookslite-backend/docs/agents/guides/ARCHITECTURE_MODULARITY_GUIDE.md
gr8bookslite-backend/docs/agents/modules/accounting_entries.md
gr8bookslite-frontend/AGENTS.md
gr8bookslite-frontend/FRONTEND_MAP.md
```

## Current State

Accounts Payable Voucher is implemented as a live backend-backed module. It is
no longer mock-backed.

The backend owns persistence, access control, transaction number resolution,
lookup data, accounting validation, statistics, and status transitions.

The frontend owns the APV list/form/view screens, local form ergonomics,
table-row editing, API mapping, report preview/PDF generation, query caching,
and display labels.

## Backend Module Structure

```text
src/modules/accounts-payable/
  accounts-payable.module.ts
  accounts-payable-voucher/
    accounts-payable-voucher.module.ts
    accounts-payable-voucher.controller.ts
    accounts-payable-voucher.service.ts
    dto/
      accounts-payable-voucher-details.dto.ts
      create-accounts-payable-voucher.dto.ts
      get-accounts-payable-voucher-list-query.dto.ts
      journal-entry.dto.ts
      update-accounts-payable-voucher.dto.ts
      update-accounts-payable-voucher-status.dto.ts
    mappers/
      accounts-payable-voucher.mapper.ts
    prisma/
      accounts-payable-voucher.include.ts
    services/
      accounts-payable-voucher-accounting.service.ts
      accounts-payable-voucher-lookup.service.ts
    types/
      accounts-payable-voucher-with-details.type.ts
    utils/
      accounts-payable-voucher-totals.util.ts
```

`AccountsPayableModule` imports `AccountsPayableVoucherModule` and is registered
in `src/app.module.ts`.

The APV module code is `APV`. Permission checks use the standard module
permission helpers and actions such as `VIEW`, `CREATE`, `UPDATE`, and `CANCEL`.

## Prisma Models

Implemented models:

```text
AccountsPayableVoucher
AccountsPayableVoucherDetails
JournalEntryHeader
JournalEntryDetail
```

Important schema details:

- `AccountsPayableVoucher.apvId` is the APV primary key and maps to
  `accounts_payable_vouchers.apv_id`.
- `AccountsPayableVoucherDetails.apvId` links detail rows to APV headers and
  maps to `accounts_payable_voucher_details.apv_id`.
- `AccountsPayableVoucherDetails` is unique by `apvId + lineNumber`.
- APV accounting entries use `JournalEntryHeader` and `JournalEntryDetail`.
- APV journal headers use `referenceType = "APV"` and `referenceId = apvId`.

The migration that introduced `apvId` and per-company `jeno` is:

```text
prisma/migrations/20260810000000_rename_apv_keys_and_add_jeno/migration.sql
```

See `../accounting_entries.md` for `JournalEntryHeader.jeno`,
`JournalEntryDetail`, validation, persistence, and frontend table behavior.

## Backend Route Contract

Base path:

```text
/api/v1/accounts-payable/accounts-payable-voucher
```

Implemented endpoints:

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/accounts-payable/accounts-payable-voucher` | List APVs with filters, sorting, pagination, statistics, and permissions. |
| `GET` | `/accounts-payable/accounts-payable-voucher/transaction-number` | Suggest the next APV transaction number for the active branch/module. |
| `GET` | `/accounts-payable/accounts-payable-voucher/lookups/parties` | Return active vendor/employee party options. |
| `GET` | `/accounts-payable/accounts-payable-voucher/lookups/terms` | Return active term options. |
| `GET` | `/accounts-payable/accounts-payable-voucher/lookups/responsibility-centers` | Return active responsibility center options. |
| `GET` | `/accounts-payable/accounts-payable-voucher/lookups/payable-accounts` | Return payable account option groups. |
| `GET` | `/accounts-payable/accounts-payable-voucher/:id` | Fetch one APV with details and journal entries. |
| `POST` | `/accounts-payable/accounts-payable-voucher` | Create a draft APV. |
| `PATCH` | `/accounts-payable/accounts-payable-voucher/:id` | Update a draft APV. |
| `PATCH` | `/accounts-payable/accounts-payable-voucher/:id/status` | Transition APV status. |

Controllers are thin. Business rules live in `accounts-payable-voucher.service.ts`
and lookup queries live in `accounts-payable-voucher-lookup.service.ts`.

## List Query

Supported query fields:

```ts
type AccountsPayableVoucherListQuery = {
  search?: string;
  branchUnitId?: number;
  status?: "DRAFT" | "APPROVED" | "DISAPPROVED" | "CLOSED" | "CANCELLED";
  documentDateFrom?: string;
  documentDateTo?: string;
  amountFrom?: number;
  amountTo?: number;
  page?: number;
  limit?: number; // max 500
  sortBy?:
    | "transactionNo"
    | "documentDate"
    | "partyName"
    | "payableType"
    | "amount"
    | "currency"
    | "status"
    | "createdAt"
    | "updatedAt";
  sortDirection?: "asc" | "desc";
};
```

The service resolves `branchUnitId` to an active company unit. If omitted, it
selects the first active transacting unit ordered by type/name/id.

## API Status and Payable Type Values

Backend status enum:

```ts
type ApiAccountsPayableVoucherStatus =
  | "DRAFT"
  | "APPROVED"
  | "DISAPPROVED"
  | "CLOSED"
  | "CANCELLED";
```

Frontend display status mapping:

```ts
{
  DRAFT: "Draft",
  APPROVED: "For Approval",
  CLOSED: "Posted",
  DISAPPROVED: "Disapproved",
  CANCELLED: "Cancelled",
}
```

Backend payable type enum:

```ts
type ApiAccountsPayableVoucherPayableType =
  | "TRADE_PAYABLE"
  | "NON_TRADE_PAYABLE"
  | "EMPLOYEE_PAYABLE"
  | "TAX_PAYABLE"
  | "ACCRUED_PAYABLE";
```

Frontend display payable type mapping:

```ts
{
  TRADE_PAYABLE: "Trade Payable",
  NON_TRADE_PAYABLE: "Non-Trade Payable",
  EMPLOYEE_PAYABLE: "Employee Payable",
  TAX_PAYABLE: "Tax Payable",
  ACCRUED_PAYABLE: "Accrued Payable",
}
```

DTOs currently accept both uppercase API enum values and display strings for
compatibility, then normalize in the backend service.

## List Response

The backend list response shape:

```ts
type ApiAccountsPayableVoucherListResponse = {
  vouchers: ApiAccountsPayableVoucher[];
  statistics: {
    totalVouchers: number;
    draftVouchers: number;
    forApprovalVouchers: number;
    postedVouchers: number;
    disapprovedVouchers: number;
    cancelledVouchers: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  permissions: AccountsPayableVoucherPermissions;
};
```

Statistics default every status counter to `0` when no transactions exist for
that status. The frontend service also normalizes missing statistics fields to
`0` and supports older `approvedVouchers` / `closedVouchers` names as a
fallback.

## Save Payload

The frontend sends APV form values through
`AccountsPayableVoucherApi.ts`, which maps form rows into this backend payload:

```ts
type AccountsPayableVoucherPayload = {
  branchUnitId?: number;
  transactionNo?: string | null;
  documentDate: string;
  partyId?: string | null;
  partyCode: string;
  partyName: string;
  address?: string | null;
  contactPerson?: string | null;
  contactNo?: string | null;
  projectCode?: string | null;
  projectName?: string | null;
  currency: string;
  exchangeRate: number;
  amount: number;
  termId: string;
  terms?: string | null;
  dueDate: string;
  referenceNo?: string | null;
  creditAccountId?: string | null;
  creditAccountCode: string;
  creditAccountTitle: string;
  payableType: ApiAccountsPayableVoucherPayableType;
  remarks?: string | null;
  details: AccountsPayableVoucherDetailsPayload[];
  journalEntries: JournalEntryPayload[];
};
```

Detail rows are APV expense lines. Journal entries are APV accounting rows. The
frontend still names these collections `expenseLines` and `accountingEntries` in
UI/form state, then maps them to `details` and `journalEntries` at the API
boundary. See `../accounting_entries.md` for the shared accounting-entry
contract.

APV-specific accounting-entry values:

```text
referenceType: "APV"
referenceId: AccountsPayableVoucher.apvId
control amount: APV detail gross amount
```

## Backend Business Rules

The APV service enforces:

- Authenticated user and active company access.
- Module permissions for view/create/update/cancel flows.
- Branch selection and branch immutability after creation.
- Draft-only edit behavior.
- Transaction number availability by company/branch and module sequence scope.
- Valid party, term, payable account, expense account, and responsibility center
  references.
- Party lookup is restricted to active vendor and employee parties.
- Detail line numbers and journal line numbers must be unique per APV payload.
- Submitted accounting totals must balance and match voucher/expense totals.
- Approval re-validates persisted details and journal entries.
- APV status transitions are constrained:
  - `DRAFT` may move to `APPROVED`, `CANCELLED`, or `DISAPPROVED`.
  - `APPROVED` may move to `DRAFT` or `CLOSED`.
  - `DISAPPROVED` may move to `DRAFT`.
  - `CANCELLED` and `CLOSED` are terminal in normal flow.

Transaction numbers use the shared transaction number sequence helper. Do not
add APV-only sequence logic.

Journal entry details, journal number allocation, and accounting-entry
validation are documented in `../accounting_entries.md`.

## Backend Mapper

`mappers/accounts-payable-voucher.mapper.ts` returns frontend-friendly fields:

- `id` is sourced from `voucher.apvId`.
- Dates are `YYYY-MM-DD`.
- Decimal database values are converted to numbers.
- Snapshots are mapped to editable/display fields such as `partyCode`,
  `partyName`, `expenseAccountCode`, and `accountTitle`.
- Journal entries are attached from `JournalEntryHeader` by APV reference.

## Frontend Module Structure

Route files:

```text
app/(modules)/accounts-payable/accounts-payable-voucher/page.tsx
app/(modules)/accounts-payable/accounts-payable-voucher/add/page.tsx
app/(modules)/accounts-payable/accounts-payable-voucher/edit/[recordId]/page.tsx
app/(modules)/accounts-payable/accounts-payable-voucher/view/[recordId]/page.tsx
```

Key frontend files:

```text
app/src/ui/modules/accounts-payable/accounts-payable-voucher/
  AccountsPayableVoucherListPage.tsx
  AccountsPayableVoucherFormPage.tsx
  AccountsPayableVoucherHeaderPage.tsx
  AccountsPayableVoucherDataEntryTables.tsx
  AccountsPayableVoucherDataEntryTableHelpers.tsx
  AccountsPayableVoucherReportPreview.tsx
  AccountsPayableVoucherPdf.ts
  AccountsPayableVoucherNotFound.tsx
  AccountsPayableVoucherTableRow.tsx

app/src/hooks/modules/accounts-payable/accounts-payable-voucher/
  useAccountsPayableVoucher.ts
  useAccountsPayableVoucherListPage.ts
  useAccountsPayableVoucherFormPage.ts

app/src/services/modules/accounts-payable/accounts-payable-voucher/
  AccountsPayableVoucherApi.ts
  AccountsPayableVoucherQueryKeys.ts

app/src/types/modules/accounts-payable/accounts-payable-voucher/
  AccountsPayableVoucherTypes.ts

app/src/data/modules/accounts-payable/accounts-payable-voucher/
  AccountsPayableVoucherData.ts
  AccountsPayableVoucherReportData.ts

app/src/validations/modules/accounts-payable/accounts-payable-voucher/
  AccountsPayableVoucherValidation.ts
```

## Frontend Behavior

The list page fetches records with React Query through
`useAccountsPayableVoucherStore`, filters by branch, and renders status metric
cards. Card counters use:

```ts
totalVouchers
draftVouchers
forApprovalVouchers
postedVouchers
disapprovedVouchers
cancelledVouchers
```

The form page:

- Uses party lookup to fill `partyCode`, party display name, address, contact,
  term defaults, payable account defaults, and purchase tax defaults.
- Displays `Party Name`, address/contact fields, `Project Name`, terms, due
  date, currency/exchange rate, payable account, APV number/date, amount,
  payable type, and reference number.
- Does not display the header `Party Code` or `Project Code` controls.
- Keeps `partyCode` and `projectCode` in form state/API payload where needed.
- Maintains editable APV expense tables and journal entry tables.
- Validates totals and balanced accounting rows before save.
- Supports report preview and PDF generation.

The frontend API adapter:

- Maps display statuses and payable types to backend enum values.
- Maps backend statuses and payable types back to display labels.
- Maps `expenseLines` to `details`.
- Maps `accountingEntries` to `journalEntries`.
- Normalizes statistics defaults to zero.
- Falls back to shared party options if the APV lookup endpoint cannot return
  parties.

Detailed accounting-entry mapping is documented in `../accounting_entries.md`.

## Lookups

Lookup endpoints support the form:

- Parties: active vendor/employee parties, including addresses, default payable
  account references, term, purchase tax default source keys, and contacts.
- Terms: active company terms with date mode and period.
- Responsibility centers: active company responsibility centers.
- Payable accounts: active chart accounts grouped into default payable and
  employee payable options using shared party-accounting account utilities.

## Testing and Maintenance Notes

When changing APV backend contracts, run:

```text
npm.cmd run db:validate:local
npm.cmd run db:generate:local
npm.cmd run typecheck
```

When changing APV frontend API or UI files, run targeted ESLint first:

```text
npx.cmd eslint app/src/services/modules/accounts-payable/accounts-payable-voucher/AccountsPayableVoucherApi.ts
npx.cmd eslint app/src/ui/modules/accounts-payable/accounts-payable-voucher/AccountsPayableVoucherFormPage.tsx
```

Full frontend lint may take longer than two minutes on this workspace. If it
times out, record the timeout and include the targeted checks that passed.

Keep API mapping changes in `AccountsPayableVoucherApi.ts`; do not leak backend
enum names into UI components.

Keep accounting validation in
`services/accounts-payable-voucher-accounting.service.ts` or
`utils/accounts-payable-voucher-totals.util.ts`; see `../accounting_entries.md`
before changing accounting-entry behavior.
