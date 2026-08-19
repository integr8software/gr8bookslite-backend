# Journal Voucher Backend Integration

This document defines the backend integration contract for the frontend Journal
Voucher module. It is an implementation plan only; this change adds no runtime
backend or frontend code.

## Scope and references

Frontend route:

```text
gr8bookslite-frontend/app/(modules)/general-journal/journal-voucher/
```

Frontend source:

```text
app/src/ui/modules/general-journal/journal-voucher/
app/src/hooks/modules/general-journal/journal-voucher/
app/src/data/modules/general-journal/journal-voucher/
app/src/types/modules/general-journal/journal-voucher/
app/src/constants/modules/general-journal/journal-voucher/
app/src/services/modules/general-journal/journal-voucher/
app/src/validations/modules/general-journal/journal-voucher/
```

The referenced architecture guide exists at
`gr8bookslite-backend/docs/agents/guides/ARCHITECTURE_MODULARITY_GUIDE.md`.
This plan also follows `gr8bookslite-frontend/AGENTS.md`,
`gr8bookslite-frontend/FRONTEND_MAP.md`, the module guide at
`app/src/agents/modules/general-journal/JournalVoucherAgent.md`, and the
backend `BACKEND_INTEGRATION_GUIDE.md`.

The current frontend is mock-backed. `MockJournalVouchers`, the local voucher
number generator, and the in-memory React Query mutations must be removed or
retired after the API is wired.

## Existing module identity

The stable module and permission code is `JV`. It is already present in:

- `gr8bookslite-backend/prisma/seeds/moduleCatalog.ts`.
- `gr8bookslite-backend/prisma/seeds/moduleSystemCatalog.ts`.
- `gr8bookslite-frontend/app/src/data/shared/modules/ModuleCatalogData.ts`.

No duplicate module catalog entry or new permission code is required. The
canonical frontend route is `/general-journal/journal-voucher`.

## Backend placement

Create the feature under the owning General Journal domain:

```text
gr8bookslite-backend/src/modules/general-journal/
  general-journal.module.ts
  journal-voucher/
    journal-voucher.module.ts
    journal-voucher.controller.ts
    journal-voucher.service.ts
    dto/
      create-journal-voucher.dto.ts
      get-journal-voucher-list-query.dto.ts
      journal-voucher-line.dto.ts
      update-journal-voucher-status.dto.ts
    mappers/
      journal-voucher.mapper.ts
    prisma/
      journal-voucher.include.ts
    services/
      journal-voucher-accounting.service.ts
      journal-voucher-lookup.service.ts
    types/
      journal-voucher-with-entries.type.ts
    utils/
      journal-voucher-totals.util.ts
```

Register `GeneralJournalModule` in `src/app.module.ts`. Keep controllers thin;
tenant checks, permission checks, reference resolution, status transitions,
accounting validation, and Prisma transactions belong in services.

Reuse `PrismaService`, `JwtAuthGuard`, `CompanyCurrencyService`, the existing
transaction-number helpers, chart-of-accounts lookups, party lookups,
responsibility-center lookups, audit-user utilities, and the shared access
control boundary. Do not create a JV-specific copy of any of these utilities.

## Persistence design

Add a company-owned `JournalVoucher` header model through a Prisma migration.
The model should contain:

- `id`, `companyId`, and `branchUnitId`.
- `transactionNo` with a unique constraint per company, branch, and active
  voucher scope.
- `documentDate`, `remarks`, `currencyCode`, and `exchangeRate`.
- A `JournalVoucherStatus` enum with `DRAFT`, `FOR_APPROVAL`, `POSTED`,
  `DISAPPROVED`, and `CANCELLED`.
- Created/updated user and timestamp fields.
- Status audit fields for approval, disapproval, posting, cancellation, and
  submission when the workflow exposes those actions.
- Indexes for `(companyId, branchUnitId, status)` and
  `(companyId, documentDate)`.

Do not create a second line model unless a future JV-only field requires it.
Reuse the existing accounting models:

```text
JournalEntryHeader.referenceType = "JV"
JournalEntryHeader.referenceId   = JournalVoucher.id
JournalEntryDetail                = the voucher accounting lines
```

Create exactly one journal-entry header per voucher and one detail row for
each line. Store the document date, currency, exchange rate, remarks, and
debit/credit totals on the journal-entry header. Store account, party,
responsibility-center, VAT, ATC, reference, and amount data on the detail
rows. Keep account code/title and other display values as snapshots while
retaining valid foreign keys where the model supports them.

The voucher workflow status is authoritative. Keep the linked journal-entry
header status synchronized in the same transaction so reports do not see a
different status from the voucher.

Required database invariants include:

- A voucher belongs to one company and one active branch/unit.
- Its transaction number is unique in the configured transaction-number scope.
- Its journal-entry reference is unique for `referenceType = "JV"` and the
  voucher id.
- Detail line numbers are unique within the journal entry.
- Monetary columns use the existing Decimal precision used by
  `JournalEntryHeader` and `JournalEntryDetail`.

## API base path and endpoints

Use the versioned Nest controller path:

```text
/api/v1/general-journal/journal-voucher
```

All endpoints require `JwtAuthGuard`. The active company comes from the
authenticated context; a client must not be able to submit an arbitrary
`companyId`. A supplied `branchUnitId` must belong to that company and the
user must have access to it.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/general-journal/journal-voucher` | Paginated list, statistics, permissions |
| GET | `/general-journal/journal-voucher/transaction-number` | Suggest the next JV number for a branch |
| GET | `/general-journal/journal-voucher/:id` | Retrieve one voucher and its entries |
| POST | `/general-journal/journal-voucher` | Create a draft voucher |
| PATCH | `/general-journal/journal-voucher/:id` | Update an editable voucher |
| PATCH | `/general-journal/journal-voucher/:id/status` | Apply an allowed workflow transition |

Do not add a hard-delete endpoint for the first integration. Preserve posted
and historical accounting records. If deletion is later required, implement a
permission-protected soft-delete workflow with audit behavior.

### List query contract

`get-journal-voucher-list-query.dto.ts` should validate and whitelist:

```text
search
branchUnitId
status: DRAFT | FOR_APPROVAL | POSTED | DISAPPROVED | CANCELLED
documentDateFrom, documentDateTo
amountFrom, amountTo        # based on total debit
page, limit
sortBy: transactionNo | documentDate | totalDebit | totalCredit |
        currencyCode | status | createdAt | updatedAt
sortDirection: asc | desc
```

The list response should be shaped by a mapper and contain lightweight rows:

```ts
{
  vouchers: Array<{
    id: string;
    branchUnitId: number;
    transactionNo: string;
    documentDate: string;
    remarks: string | null;
    currencyCode: string;
    exchangeRate: number;
    totalDebit: number;
    totalCredit: number;
    status: "DRAFT" | "FOR_APPROVAL" | "POSTED" | "DISAPPROVED" | "CANCELLED";
    createdAt: string;
    updatedAt: string;
  }>;
  statistics: {
    totalVouchers: number;
    draftVouchers: number;
    forApprovalVouchers: number;
    postedVouchers: number;
    disapprovedVouchers: number;
    cancelledVouchers: number;
  };
  pagination: { page: number; limit: number; total: number; totalPages: number };
  permissions: JournalVoucherPermissions;
}
```

### Create and update payload

Use DTOs with `class-validator`. The API contract should use backend accounting
names and let the frontend mapper translate its current names:

```ts
{
  branchUnitId?: number;
  transactionNo?: string | null; // server-generated when omitted
  documentDate: string;           // ISO date
  currencyCode: string;
  exchangeRate: number;
  remarks?: string | null;
  lines: Array<{
    lineNumber: number;
    accountId?: string | null;
    accountCode: string;
    accountTitle?: string | null; // display compatibility; backend resolves the account
    particulars?: string | null;
    partyId?: string | null;
    partyCode?: string | null;
    partyName?: string | null;
    responsibilityCenterId?: string | null;
    responsibilityCenter?: string | null;
    refNo?: string | null;
    vatType?: string | null;
    atcCode?: string | null;
    debit: number;
    credit: number;
  }>;
}
```

The create and update response should return `{ message, voucher, permissions }`.
The detail mapper should return the same header fields plus `lines`, with
string ids, ISO dates, JavaScript numbers for Decimal values, and canonical
account/party/responsibility-center snapshots. Map backend status values to the
frontend labels in the frontend service mapper:

```text
DRAFT        -> Draft
FOR_APPROVAL -> For Approval
POSTED       -> Posted
DISAPPROVED  -> Disapproved
CANCELLED    -> Cancelled
```

### Transaction number

Use the existing transaction-number sequence helper with module code `JV`.
Do not generate `JV-YYYY-####` in the frontend or service by scanning existing
rows. Honor the configured branch sequence, input mode, uniqueness scope,
prefix, suffix, and padding. A manual number may be accepted only when the
branch sequence is configured for manual input.

### Status workflow

The backend must ignore a client-supplied status on create and create every
voucher as `DRAFT`. Updates must not allow a caller to bypass the status
endpoint.

The current frontend permits editing `DRAFT` and `FOR_APPROVAL` records and
exposes these status actions:

```text
FOR_APPROVAL -> POSTED       (Approve)
POSTED       -> FOR_APPROVAL (Undo Posted)
FOR_APPROVAL -> DISAPPROVED  (Disapprove)
DISAPPROVED  -> FOR_APPROVAL (Undo Disapproved)
DRAFT        -> CANCELLED    (Cancel)
FOR_APPROVAL -> CANCELLED    (Cancel)
CANCELLED    -> FOR_APPROVAL (Uncancelled)
```

The UI currently has no explicit “Submit for Approval” action even though a
new voucher starts as `DRAFT`. Add that action during frontend wiring, or keep
the transition available through the status endpoint for a later UI change:

```text
DRAFT -> FOR_APPROVAL
```

Reject all other transitions with a domain `BadRequestException`. Use
`JV:UPDATE` for prepare/approve/disapprove/post actions and `JV:CANCEL` for
cancellation actions, following the existing APV permission convention. A
`POSTED` transition must revalidate persisted lines and update the voucher and
linked journal-entry header atomically.

## Accounting and reference validation

The module accounting service must enforce these rules on create, update, and
again before posting:

- At least two lines are present.
- Line numbers are positive, unique, and persisted in display order.
- Every line resolves to an active posting account belonging to the company.
- Each line has either a positive debit or a positive credit, never both.
- Debit and credit values are non-negative and limited to two decimal places.
- At least one debit and one credit exist.
- Total debit equals total credit using rounded Decimal/currency comparison.
- `exchangeRate` is greater than zero and `currencyCode` is valid for the
  company. Do not trust client-provided line currency or exchange-rate values;
  inherit both from the header.
- An optional party and responsibility center resolve within the active company
  and are active when selected. Store their current display values as snapshots.
- The backend canonicalizes account code/title from the selected Chart Account;
  it must not trust a stale `accountTitle` sent by the browser.
- Remarks are capped at 500 characters, transaction numbers follow the configured
  sequence, and document dates are valid ISO dates.

Create/update must write the voucher header and its linked journal-entry header
and details in one short Prisma transaction. Replace editable journal details
within that transaction. Never call an external provider from this transaction.

## Lookups

Reuse existing company-scoped lookup APIs instead of duplicating lookup queries
inside the frontend or adding redundant generic helpers:

```text
GET /api/v1/maintenance/chart-of-accounts/options/posting-accounts
GET /api/v1/maintenance/party-maintenance/options
GET /api/v1/maintenance/financial-management/responsibility-centers/options
```

The JV lookup service may coordinate these dependencies for one form bootstrap
response if that matches established module patterns, but each lookup must keep
its owning domain's service and permission boundary. Currency exchange rates
should continue using the existing multi-currency service; JV only validates the
submitted company currency and positive rate.

## Frontend wiring requirements

After the backend exists:

1. Add `JournalVoucherService.ts` under the existing feature services folder and
   call the shared `ApiClient`; do not repeat bearer-token or base-URL logic.
2. Add typed API response/request shapes and explicit API-to-UI mappers. Keep
   route files thin and keep API calls out of UI components.
3. Replace `MockJournalVouchers` reads and local mutation functions in
   `useJournalVoucher.ts` with React Query queries and mutations.
4. Scope query keys by active company, active branch/unit, filters, pagination,
   and sort. The current `JournalVoucherQueryKeys.records()` key is too broad
   for tenant-owned data.
5. Invalidate or update the detail and list keys after create, update, and
   status mutations. Do not retain a silent mock fallback after API success.
6. Replace `createNextJournalVoucherNumber()` with the transaction-number
   endpoint and keep only pure line/default factories in `data`.
7. Use API permissions and server status transitions to enable actions; frontend
   Zod validation remains a user-experience guard, not the authority.
8. Load account, party, and responsibility-center options through their existing
   API-backed stores or services instead of static demo records.

## Seed, provisioning, and migration

The `JV` platform module and sidebar metadata already exist, so this feature
does not require a new module catalog seed. If the runtime requires a default
JV transaction-number sequence for every company/branch, classify it as
company-owned transaction setup and register it through the existing company
bootstrap flow, not a manual standalone script.

Schema work requires a new Prisma migration. Read the repository Prisma
workflow before changing `schema.prisma`; never edit an applied migration.
The migration must include the voucher table, enum, indexes, unique
constraints, and any required relation fields on `Company` and `CompanyUnit`.

## Verification checklist

Backend tests should cover:

- DTO validation and friendly error mapping.
- Company, branch, membership, and `JV` permission isolation.
- Transaction-number suggestion, manual input rules, and duplicate handling.
- Account, party, and responsibility-center ownership/active-state checks.
- Minimum lines, exclusive debit/credit sides, balance, currency, and rate rules.
- Atomic create/update of the voucher and linked journal entry.
- Every allowed and rejected status transition, including persisted revalidation
  before posting.
- List filters, sorting, pagination, statistics, and mapper Decimal/BigInt output.

Run the relevant backend typecheck and tests, then the frontend `npm run lint`
and `npm run build`. Manually verify add, edit, view, list filtering, currency
change, balanced-entry save, status actions, branch switching, and tenant
isolation before marking the integration complete.

