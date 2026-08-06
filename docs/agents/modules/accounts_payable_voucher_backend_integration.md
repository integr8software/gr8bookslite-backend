# Accounts Payable Voucher Backend Integration Plan

This document defines the backend integration target for the frontend Accounts
Payable Voucher module:

```text
gr8bookslite-frontend/app/(modules)/accounts-payable/accounts-payable-voucher/
gr8bookslite-frontend/app/src/ui/modules/accounts-payable/accounts-payable-voucher/
```

Use this together with:

```text
gr8bookslite-backend/docs/agents/guides/BACKEND_INTEGRATION_GUIDE.md
gr8bookslite-backend/docs/agents/guides/ARCHITECTURE_MODULARITY_GUIDE.md
gr8bookslite-frontend/AGENTS.md
gr8bookslite-frontend/FRONTEND_MAP.md
gr8bookslite-frontend/app/src/agents/modules/accounts-payable/AccountsPayableVoucherAgent.md
```

## Current State

The frontend Accounts Payable Voucher module is implemented but still
mock-backed.

Frontend files already exist:

```text
app/(modules)/accounts-payable/accounts-payable-voucher/page.tsx
app/(modules)/accounts-payable/accounts-payable-voucher/add/page.tsx
app/(modules)/accounts-payable/accounts-payable-voucher/edit/[recordId]/page.tsx
app/(modules)/accounts-payable/accounts-payable-voucher/view/[recordId]/page.tsx
app/src/ui/modules/accounts-payable/accounts-payable-voucher/
app/src/hooks/modules/accounts-payable/accounts-payable-voucher/
app/src/data/modules/accounts-payable/accounts-payable-voucher/AccountsPayableVoucherData.ts
app/src/types/modules/accounts-payable/accounts-payable-voucher/AccountsPayableVoucherTypes.ts
app/src/constants/modules/accounts-payable/accounts-payable-voucher/AccountsPayableVoucherConstants.ts
app/src/validations/modules/accounts-payable/accounts-payable-voucher/AccountsPayableVoucherValidation.ts
app/src/services/modules/accounts-payable/accounts-payable-voucher/AccountsPayableVoucherQueryKeys.ts
```

Backend gaps:

- No backend `accounts-payable` domain module exists yet.
- No Prisma AP voucher, AP voucher details, or shared journal entry models exist
  yet.
- No AP voucher API service/controller/DTO/mapper exists yet.
- The frontend hook still reads and mutates `MockAccountsPayableVouchers`.
- Transaction number generation is currently frontend-only and based on mock
  records.

Existing backend support to reuse:

- Module catalog and sidebar metadata already contain stable module code `APV`.
- Permission compatibility exists for legacy
  `accounts-payable-accounts-payable-voucher` payloads.
- Party, terms, chart of accounts, responsibility center, tax, transaction
  number sequence, and form signatory infrastructure already exist in backend
  source/schema.

## Backend Module Target

Create the owning backend feature under a new accounts-payable domain:

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
    types/
      accounts-payable-voucher-with-details.type.ts
    utils/
      accounts-payable-voucher-totals.util.ts
```

Register `AccountsPayableModule` in `src/app.module.ts`. If a parent domain
module is not introduced during implementation, register
`AccountsPayableVoucherModule` directly in `AppModule`, matching current
maintenance module registration.

Use the same thin-controller pattern as the maintenance modules:

- `JwtAuthGuard`
- `@CurrentUser()` for active company context
- versioned Nest controller route
- DTO validation with `class-validator`
- service-owned tenant, permission, and accounting rules
- mapper-owned API response shapes

Import `TransactionNumberSequencesModule` or call the re-exported helper
functions from:

```text
src/modules/system-administration/transaction-number-sequences/transaction-number-sequences.service.ts
src/modules/system-administration/transaction-number-sequences/transaction-number-sequence.helper.ts
```

Do not create APV-only transaction-number logic.

## Backend Route Contract

Base path:

```text
/api/v1/accounts-payable/accounts-payable-voucher
```

Frontend constant to add:

```ts
export const AccountsPayableVoucherApiPath =
  "/accounts-payable/accounts-payable-voucher";
```

Required endpoints:

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/accounts-payable/accounts-payable-voucher` | List AP vouchers with search, date range, amount range, status, sorting, pagination, statistics, and permissions. |
| `GET` | `/accounts-payable/accounts-payable-voucher/:id` | Fetch one AP voucher with details and journal entries. |
| `GET` | `/accounts-payable/accounts-payable-voucher/number-suggestion` | Return the next transaction number for the active branch/module. |
| `POST` | `/accounts-payable/accounts-payable-voucher` | Create a draft AP voucher. |
| `PATCH` | `/accounts-payable/accounts-payable-voucher/:id` | Update a draft AP voucher header, details, and journal entries. |
| `PATCH` | `/accounts-payable/accounts-payable-voucher/:id/status` | Move between allowed statuses: `DRAFT`, `APPROVED`, `DISAPPROVED`, `CANCELLED`, `CLOSED`. |

Do not add a physical delete endpoint for the normal list action unless product
requirements explicitly require permanent deletion. The current UI's destructive
actions should become status transitions or soft-delete/admin-only behavior.

## Frontend Contract To Support

The frontend currently expects this display record shape:

```ts
type AccountsPayableVoucherRecord = {
  id: string;
  transactionNo: string;
  documentDate: string;
  partyCode: string;
  partyName: string;
  address: string;
  contactPerson: string;
  contactNo: string;
  projectName: string;
  currency: string;
  exchangeRate: number;
  amount: number;
  termId: string;
  terms: string;
  dueDate: string;
  referenceNo: string;
  creditAccountCode: string;
  creditAccountTitle: string;
  payableType:
    | "Trade Payable"
    | "Non-Trade Payable"
    | "Employee Payable"
    | "Tax Payable"
    | "Accrued Payable";
  remarks: string;
  status: "Draft" | "Approved" | "Disapproved" | "Closed" | "Cancelled";
  details: AccountsPayableVoucherDetails[];
  journalEntries: JournalEntry[];
  createdAt: string;
  updatedAt: string;
};
```

The existing frontend uses `expenseLines` and `accountingEntries` today. Backend
integration should rename those frontend fields during the API wiring pass so
the APV-specific rows are `details` and reusable accounting rows are
`journalEntries`.

Prefer uppercase backend enum values and map them in the frontend service:

```ts
type ApiAccountsPayableVoucherStatus =
  | "DRAFT"
  | "APPROVED"
  | "DISAPPROVED"
  | "CLOSED"
  | "CANCELLED";

type ApiAccountsPayableVoucherPayableType =
  | "TRADE_PAYABLE"
  | "NON_TRADE_PAYABLE"
  | "EMPLOYEE_PAYABLE"
  | "TAX_PAYABLE"
  | "ACCRUED_PAYABLE";
```

Required list response:

```ts
type ApiAccountsPayableVoucherListResponse = {
  vouchers: ApiAccountsPayableVoucher[];
  statistics: {
    totalVouchers: number;
    draftVouchers: number;
    approvedVouchers: number;
    disapprovedVouchers: number;
    closedVouchers: number;
    cancelledVouchers: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  permissions: {
    canView: boolean;
    canCreate: boolean;
    canUpdate: boolean;
    canApprove: boolean;
    canDisapprove: boolean;
    canCancel: boolean;
    canClose: boolean;
    canExport: boolean;
  };
};
```

Detail/create/update/status responses should return the mapped voucher:

```ts
type ApiAccountsPayableVoucherSaveResponse = {
  message: string;
  voucher: ApiAccountsPayableVoucher;
  permissions?: ApiAccountsPayableVoucherPermissions;
};
```

## Data Model Target

Add transaction-owned Prisma models and enums. Keep AP voucher data company and
branch scoped because the workflow depends on active company, active branch, and
transaction-number setup.

Suggested Prisma shape:

```prisma
model AccountsPayableVoucher {
  id                   BigInt                            @id @default(autoincrement())
  companyId            Int                               @map("company_id")
  branchUnitId         Int                               @map("branch_unit_id")
  partyId              BigInt?                           @map("party_id")
  termId               BigInt?                           @map("term_id")
  creditAccountId      BigInt                            @map("credit_account_id")
  transactionNo        String                            @map("transaction_no") @db.VarChar(80)
  documentDate         DateTime                          @map("document_date") @db.Date
  dueDate              DateTime                          @map("due_date") @db.Date
  referenceNo          String?                           @map("reference_no") @db.VarChar(120)
  partyCodeSnapshot    String                            @map("party_code_snapshot") @db.VarChar(80)
  partyNameSnapshot    String                            @map("party_name_snapshot") @db.VarChar(255)
  addressSnapshot      String?                           @map("address_snapshot") @db.VarChar(500)
  contactPersonSnapshot String?                          @map("contact_person_snapshot") @db.VarChar(255)
  contactNoSnapshot    String?                           @map("contact_no_snapshot") @db.VarChar(40)
  projectName          String?                           @map("project_name") @db.VarChar(255)
  currencyCode         String                            @map("currency_code") @db.VarChar(10)
  exchangeRate         Decimal                           @map("exchange_rate") @db.Decimal(18, 6)
  amount               Decimal                           @db.Decimal(18, 2)
  payableType          AccountsPayableVoucherPayableType @map("payable_type")
  remarks              String?                           @db.VarChar(500)
  status               AccountsPayableVoucherStatus      @default(DRAFT)
  createdByUserId      Int?                              @map("created_by_user_id")
  updatedByUserId      Int?                              @map("updated_by_user_id")
  approvedByUserId     Int?                              @map("approved_by_user_id")
  approvedAt           DateTime?                         @map("approved_at")
  disapprovedByUserId  Int?                              @map("disapproved_by_user_id")
  disapprovedAt        DateTime?                         @map("disapproved_at")
  cancelledByUserId    Int?                              @map("cancelled_by_user_id")
  cancelledAt          DateTime?                         @map("cancelled_at")
  closedByUserId       Int?                              @map("closed_by_user_id")
  closedAt             DateTime?                         @map("closed_at")
  deletedAt            DateTime?                         @map("deleted_at")
  createdAt            DateTime                          @default(now()) @map("created_at")
  updatedAt            DateTime                          @updatedAt @map("updated_at")
  company              Company                           @relation(fields: [companyId], references: [id], onDelete: Cascade)
  branchUnit           CompanyUnit                       @relation(fields: [branchUnitId], references: [id], onDelete: Restrict)
  party                Party?                            @relation(fields: [partyId], references: [id], onDelete: SetNull)
  term                 Term?                             @relation(fields: [termId], references: [id], onDelete: SetNull)
  creditAccount        ChartAccount                      @relation(fields: [creditAccountId], references: [id], onDelete: Restrict)
  details              AccountsPayableVoucherDetails[]

  @@unique([companyId, branchUnitId, transactionNo], map: "ap_vouchers_company_branch_transaction_no_key")
  @@index([companyId, branchUnitId, status], map: "ap_vouchers_company_branch_status_idx")
  @@index([companyId, documentDate], map: "ap_vouchers_company_document_date_idx")
  @@index([partyId], map: "ap_vouchers_party_id_idx")
  @@index([creditAccountId], map: "ap_vouchers_credit_account_id_idx")
  @@map("accounts_payable_vouchers")
}

model AccountsPayableVoucherDetails {
  id                     BigInt                 @id @default(autoincrement())
  voucherId              BigInt                 @map("voucher_id")
  companyId              Int                    @map("company_id")
  branchUnitId           Int                    @map("branch_unit_id")
  partyId                BigInt?                @map("party_id")
  lineNumber             Int                    @map("line_number")
  expenseAccountId       BigInt                 @map("expense_account_id")
  expenseAccountCodeSnapshot String             @map("expense_account_code_snapshot") @db.VarChar(20)
  expenseTypeSnapshot    String                 @map("expense_type_snapshot") @db.VarChar(250)
  currencyCode           String                 @map("currency_code") @db.VarChar(10)
  exchangeRate           Decimal                @map("exchange_rate") @db.Decimal(18, 6)
  amount                 Decimal                @db.Decimal(18, 2)
  netAmount              Decimal                @map("net_amount") @db.Decimal(18, 2)
  vat                    String?                @db.VarChar(80)
  vatPercent             Decimal                @default(0) @map("vat_percent") @db.Decimal(8, 4)
  vatAmount              Decimal                @default(0) @map("vat_amount") @db.Decimal(18, 2)
  ewt                    String?                @db.VarChar(80)
  ewtPercent             Decimal                @default(0) @map("ewt_percent") @db.Decimal(8, 4)
  ewtAmount              Decimal                @default(0) @map("ewt_amount") @db.Decimal(18, 2)
  totalAmountDue         Decimal                @map("total_amount_due") @db.Decimal(18, 2)
  partyCodeSnapshot      String?                @map("party_code_snapshot") @db.VarChar(80)
  partyNameSnapshot      String?                @map("party_name_snapshot") @db.VarChar(255)
  particulars            String?                @db.VarChar(500)
  responsibilityCenterId BigInt?                @map("responsibility_center_id")
  responsibilityCenterSnapshot String?          @map("responsibility_center_snapshot") @db.VarChar(150)
  referenceNo            String?                @map("reference_no") @db.VarChar(120)
  voucher                AccountsPayableVoucher @relation(fields: [voucherId], references: [id], onDelete: Cascade)
  company                Company                @relation(fields: [companyId], references: [id], onDelete: Cascade)
  branchUnit             CompanyUnit            @relation(fields: [branchUnitId], references: [id], onDelete: Restrict)
  party                  Party?                 @relation(fields: [partyId], references: [id], onDelete: SetNull)
  expenseAccount         ChartAccount           @relation(fields: [expenseAccountId], references: [id], onDelete: Restrict)
  responsibilityCenter   ResponsibilityCenter?  @relation(fields: [responsibilityCenterId], references: [id], onDelete: SetNull)

  @@unique([voucherId, lineNumber], map: "ap_voucher_details_voucher_line_key")
  @@index([companyId, branchUnitId], map: "ap_voucher_details_company_branch_idx")
  @@index([partyId], map: "ap_voucher_details_party_id_idx")
  @@index([expenseAccountId], map: "ap_voucher_details_expense_account_idx")
  @@index([responsibilityCenterId], map: "ap_voucher_details_rc_idx")
  @@map("accounts_payable_voucher_details")
}

model JournalEntry {
  id                     BigInt                @id @default(autoincrement())
  companyId              Int                   @map("company_id")
  branchUnitId           Int                   @map("branch_unit_id")
  referenceType          String                @map("reference_type") @db.VarChar(20)
  referenceId            BigInt                @map("reference_id")
  referenceNoSnapshot    String?               @map("reference_no_snapshot") @db.VarChar(120)
  lineNumber             Int                   @map("line_number")
  accountId              BigInt                @map("account_id")
  accountCodeSnapshot    String                @map("account_code_snapshot") @db.VarChar(20)
  accountTitleSnapshot   String                @map("account_title_snapshot") @db.VarChar(250)
  currencyCode           String                @map("currency_code") @db.VarChar(10)
  exchangeRate           Decimal               @map("exchange_rate") @db.Decimal(18, 6)
  particulars            String?               @db.VarChar(500)
  debit                  Decimal               @default(0) @db.Decimal(18, 2)
  credit                 Decimal               @default(0) @db.Decimal(18, 2)
  vatType                String?               @map("vat_type") @db.VarChar(80)
  atcCode                String?               @map("atc_code") @db.VarChar(80)
  partyCodeSnapshot      String?               @map("party_code_snapshot") @db.VarChar(80)
  partyNameSnapshot      String?               @map("party_name_snapshot") @db.VarChar(255)
  responsibilityCenterId BigInt?               @map("responsibility_center_id")
  responsibilityCenterSnapshot String?         @map("responsibility_center_snapshot") @db.VarChar(150)
  refNo                  String?               @map("ref_no") @db.VarChar(120)
  createdAt              DateTime              @default(now()) @map("created_at")
  updatedAt              DateTime              @updatedAt @map("updated_at")
  company                Company               @relation(fields: [companyId], references: [id], onDelete: Cascade)
  branchUnit             CompanyUnit           @relation(fields: [branchUnitId], references: [id], onDelete: Restrict)
  account                ChartAccount          @relation(fields: [accountId], references: [id], onDelete: Restrict)
  responsibilityCenter   ResponsibilityCenter? @relation(fields: [responsibilityCenterId], references: [id], onDelete: SetNull)

  @@unique([companyId, branchUnitId, referenceType, referenceId, lineNumber], map: "journal_entries_reference_line_key")
  @@index([companyId, branchUnitId, referenceType, referenceId], map: "journal_entries_reference_idx")
  @@index([companyId, branchUnitId, referenceType], map: "journal_entries_reference_type_idx")
  @@index([accountId], map: "journal_entries_account_idx")
  @@index([responsibilityCenterId], map: "journal_entries_rc_idx")
  @@map("journal_entries")
}

enum AccountsPayableVoucherStatus {
  DRAFT
  APPROVED
  DISAPPROVED
  CLOSED
  CANCELLED
}

enum AccountsPayableVoucherPayableType {
  TRADE_PAYABLE
  NON_TRADE_PAYABLE
  EMPLOYEE_PAYABLE
  TAX_PAYABLE
  ACCRUED_PAYABLE
}
```

`JournalEntry.referenceType` is the shared accounting-module discriminator. APV
must write `referenceType: "APV"` and `referenceId: voucher.id`. Future modules
should use their stable module codes, such as `CV` for cash voucher and `OR` for
official receipt. Keep `referenceType` as a short string rather than a Prisma
enum unless the team explicitly wants a migration every time a transaction
module starts writing journal entries.

Before finalizing relation names, run `npx prisma validate`. These models add
relations to existing `Company`, `CompanyUnit`, `Party`, `Term`,
`ChartAccount`, and `ResponsibilityCenter` models, so reverse relation names may
need explicit names if Prisma reports ambiguity. If `JournalEntry` becomes
shared by several modules in the same implementation, consider placing it under
a shared accounting or general-ledger backend boundary instead of hiding it
inside the APV folder.

## DTO Rules

Create/update DTOs should accept backend enum values and record IDs, not only
display strings.

Create payload:

```ts
type CreateAccountsPayableVoucherPayload = {
  transactionNo?: string;
  documentDate: string;
  partyId?: string | null;
  partyCode: string;
  partyName: string;
  address?: string | null;
  contactPerson?: string | null;
  contactNo?: string | null;
  projectName?: string | null;
  currency: string;
  exchangeRate: number;
  termId: string;
  terms?: string;
  dueDate: string;
  referenceNo?: string | null;
  creditAccountId?: string;
  creditAccountCode: string;
  creditAccountTitle: string;
  payableType: ApiAccountsPayableVoucherPayableType;
  remarks?: string | null;
  details: AccountsPayableVoucherDetailsPayload[];
  journalEntries: JournalEntryPayload[];
};
```

Details payload:

```ts
type AccountsPayableVoucherDetailsPayload = {
  lineNumber: number;
  partyId?: string | null;
  expenseAccountId?: string;
  expenseAccountCode: string;
  expenseType: string;
  currencyCode: string;
  exchangeRate: number;
  amount: number;
  netAmount: number;
  vat?: string | null;
  vatPercent: number;
  vatAmount: number;
  ewt?: string | null;
  ewtPercent: number;
  ewtAmount: number;
  totalAmountDue: number;
  partyCode?: string | null;
  partyName?: string | null;
  particulars?: string | null;
  responsibilityCenterId?: string | null;
  responsibilityCenter?: string | null;
  referenceNo?: string | null;
};
```

Do not accept `companyId` or `branchUnitId` from the frontend detail payload.
Stamp detail rows with the active backend `companyId` and `branchUnitId`
(`branch_unit_id` database column) during create/update.

Journal entry payload:

```ts
type JournalEntryPayload = {
  referenceType: "APV";
  lineNumber: number;
  accountId?: string;
  accountCode: string;
  accountTitle: string;
  currencyCode: string;
  exchangeRate: number;
  particulars?: string | null;
  debit: number;
  credit: number;
  vatType?: string | null;
  atcCode?: string | null;
  partyCode?: string | null;
  partyName?: string | null;
  responsibilityCenterId?: string | null;
  responsibilityCenter?: string | null;
  refNo?: string | null;
};
```

List query DTO:

```ts
{
  search?: string;
  status?: AccountsPayableVoucherStatus;
  documentDateFrom?: string;
  documentDateTo?: string;
  amountFrom?: number;
  amountTo?: number;
  page?: number;
  limit?: number;
  sortBy?: "transactionNo" | "documentDate" | "partyName" | "payableType" | "amount" | "currency" | "status" | "createdAt" | "updatedAt";
  sortDirection?: "asc" | "desc";
}
```

Status DTO:

```ts
{
  status: AccountsPayableVoucherStatus;
  reason?: string;
}
```

Validation rules:

- Trim strings in service methods before persistence.
- `documentDate` and `dueDate` must parse to valid dates.
- `currency` is required and should match an enabled company/system currency
  when that backend source is available.
- `exchangeRate` must be greater than zero.
- Detail and journal entry `currencyCode` values are required and must match
  the voucher header currency for the initial APV flow.
- Detail and journal entry `exchangeRate` values are required and must be
  greater than zero. They should match the voucher header exchange rate unless
  mixed-currency rows are introduced intentionally.
- `termId` must reference an active company term unless the workflow later
  supports free-text terms.
- Header and detail row `partyId`, when provided, must reference an active
  company party with a vendor, employee, or payable-compatible party type.
- `creditAccountId` or `creditAccountCode` must resolve to an active company
  posting chart account.
- `remarks` must be 500 characters or fewer.
- At least one APV detail row is required when the details flow is used.
- At least two journal entries are required.
- Detail row amount must be non-zero.
- Journal entry `referenceType` must be `APV`.
- Journal entry debit and credit cannot both be positive.
- Journal entry debit and credit cannot both be zero.
- Debit and credit totals must balance.
- Detail total due must match voucher amount.
- Journal entry debit and credit totals must match the details control total.

## Service Rules

Required service methods:

```ts
findAll(user, query)
findOne(user, id)
suggestTransactionNumber(user)
create(user, dto)
update(user, id, dto)
updateStatus(user, id, dto)
```

Service responsibilities:

- Resolve active `companyId` from `AuthUser.companyId`.
- Resolve active `branchUnitId` from the auth/session branch context. If the
  current `AuthUser` shape does not expose a branch/unit ID yet, add that access
  at the auth/session boundary before trusting a frontend-supplied branch ID.
- Ensure company and branch membership access on the backend.
- Enforce module permissions with module code `APV`.
- Filter all voucher reads by `companyId`, `branchUnitId`, and `deletedAt: null`.
- Search by transaction number, party code, party name, payable type, reference
  number, and remarks.
- Sort only by whitelisted fields.
- Generate transaction numbers through the existing
  `transaction-number-sequences` module for module code `APV` and the active
  branch when `transactionNo` is omitted.
- Prevent duplicate transaction numbers within the same company and branch.
- Validate referenced party, term, chart accounts, and responsibility centers
  against the active company.
- Store party, term, account, and responsibility center display snapshots so
  historical vouchers remain readable after maintenance records are renamed.
- Store `currencyCode` and `exchangeRate` on APV details and journal entries as
  transaction snapshots. For APV, default row values from the voucher header.
- Store `companyId`, `branchUnitId`, and optional `partyId` on each APV detail
  row. Derive company and branch from the active backend scope, not from request
  payload values.
- Recalculate totals server-side using decimal-safe helpers before saving.
- Replace APV details and `JournalEntry` rows transactionally during draft
  create/update.
- Persist APV journal rows with `referenceType: "APV"` and
  `referenceId: voucher.id`.
- Return mapped API records, never raw Prisma records.

Use a short transaction for create/update:

```text
1. Validate access, permissions, references, status, and totals.
2. For create with automatic numbering, call
   generateTransactionNumberForCompanyBranch(tx, { moduleCode: "APV", ... }).
3. Create/update the voucher header.
4. Replace APV details.
5. Replace journal entries where referenceType = "APV" and referenceId = voucher.id.
6. Commit.
7. Return the mapped voucher.
```

Do not call external providers inside the transaction. Exchange-rate fetches
remain outside AP voucher persistence; save the submitted exchange-rate snapshot.

## Status Workflow

The frontend currently exposes these status actions:

- `Draft` can be edited.
- `Draft` can become `Approved`, `Disapproved`, or `Cancelled`.
- `Approved` can be undone back to `Draft`.
- `Disapproved` can be undone back to `Draft`.
- `Cancelled` can be undone back to `Draft`.
- `Closed` is readonly.

Backend should be authoritative for the transition matrix:

| From | Allowed To | Notes |
| --- | --- | --- |
| `DRAFT` | `APPROVED`, `DISAPPROVED`, `CANCELLED` | Revalidate full voucher before approval. |
| `APPROVED` | `DRAFT`, `CLOSED` | Allow undo only if no downstream payment/closing record exists. |
| `DISAPPROVED` | `DRAFT` | Clear or preserve disapproval metadata by explicit product decision. |
| `CANCELLED` | `DRAFT` | Allow only if no downstream record exists. |
| `CLOSED` | none initially | Closed vouchers are readonly in the current UI. |

`updateStatus` should set audit fields such as `approvedByUserId`,
`approvedAt`, `cancelledByUserId`, and `cancelledAt`. When undoing a status,
clear the corresponding status metadata unless audit history is moved into a
separate approval/history table.

## Mapper Rules

Create:

```text
src/modules/accounts-payable/accounts-payable-voucher/mappers/accounts-payable-voucher.mapper.ts
```

Mapper output should:

- Serialize BigInt IDs as strings.
- Emit dates as ISO strings or `YYYY-MM-DD` according to the frontend service
  mapper. Keep the service mapper stable once chosen.
- Convert Prisma decimals to numbers.
- Normalize nullable text fields to `null` in the API response.
- Include display snapshots for party/account/responsibility center fields.
- Include `currencyCode` and `exchangeRate` snapshots on detail and journal
  rows.
- Include audit names using `resolveAuditUserNames` and
  `SystemGeneratedAuditLabel`.
- Avoid leaking raw Prisma relation payloads.

Suggested API record:

```ts
type ApiAccountsPayableVoucher = {
  id: string;
  transactionNo: string;
  documentDate: string;
  partyId: string | null;
  partyCode: string;
  partyName: string;
  address: string | null;
  contactPerson: string | null;
  contactNo: string | null;
  projectName: string | null;
  currency: string;
  exchangeRate: number;
  amount: number;
  termId: string | null;
  terms: string | null;
  dueDate: string;
  referenceNo: string | null;
  creditAccountId: string;
  creditAccountCode: string;
  creditAccountTitle: string;
  payableType: ApiAccountsPayableVoucherPayableType;
  remarks: string | null;
  status: ApiAccountsPayableVoucherStatus;
  details: ApiAccountsPayableVoucherDetails[];
  journalEntries: ApiJournalEntry[];
  createdBy: string | null;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string;
};
```

Row responses should include the row-level currency snapshots:

```ts
type ApiAccountsPayableVoucherDetails = {
  id: string;
  companyId: number;
  branchUnitId: number;
  partyId: string | null;
  lineNumber: number;
  currencyCode: string;
  exchangeRate: number;
  amount: number;
  netAmount: number;
  totalAmountDue: number;
};

type ApiJournalEntry = {
  id: string;
  referenceType: "APV" | "CV" | "OR" | string;
  referenceId: string;
  lineNumber: number;
  currencyCode: string;
  exchangeRate: number;
  debit: number;
  credit: number;
};
```

## Accounting Rules

The backend must enforce the accounting invariants currently guarded by
frontend Zod and hook helpers:

- APV details generate or persist journal entries according to the saved
  payload; backend validation must not rely on frontend generation being correct.
- APV-created journal rows must always use `referenceType: "APV"` and the
  persisted voucher ID as `referenceId`.
- Gross, net, VAT, EWT, total due, debit, credit, and variance calculations must
  use decimal-safe rounding to two currency places unless product requirements
  define currency-specific precision.
- Input VAT and EWT codes should resolve against the tax catalog where possible.
- Tax posting defaults should reuse the tax posting/account mapping direction
  documented in `TAX_MAINTENANCE_GLOBAL_ARCHITECTURE.md`.
- Credit account must be a company-owned active posting account.
- Detail and manual journal entry accounts must be company-owned active posting
  accounts.
- Responsibility center values should resolve to active company responsibility
  centers when provided.

Keep generated-accounting behavior discoverable. If the backend generates
entries, keep that logic in
`services/accounts-payable-voucher-accounting.service.ts` or
`utils/accounts-payable-voucher-totals.util.ts`, not in the controller.

## Permissions

Use the seeded stable module code:

```text
APV
```

Recommended permission checks:

```text
APV:VIEW       list/read vouchers
APV:CREATE     create draft vouchers
APV:UPDATE     edit draft vouchers and undo allowed statuses
APV:APPROVE    approve/disapprove vouchers, if PermissionAction supports it
APV:CANCEL     cancel vouchers, if PermissionAction supports it
APV:EXPORT     export list/detail data
```

If `PermissionAction` does not yet include `APPROVE` or `CANCEL`, either add
those platform actions and wire provisioning, or map approval/cancel operations
to `APV:UPDATE` as an explicit interim decision. Do not hardcode approval
rights only in the frontend.

Reserved company admin access should follow the same shape as maintenance
services: `SUPER_ADMIN`, company `ADMIN`, or active admin membership can bypass
module-specific permission checks when that is the established policy.

## Transaction Number Integration

The frontend currently creates numbers like:

```text
APV-2026-0001
```

Backend integration should replace this with the transaction-number setup
module:

```text
prisma/schema.prisma -> TransactionNumberSequence
src/modules/system-administration/transaction-number-sequences/
src/modules/system-administration/transaction-number-sequences/transaction-number-sequence.helper.ts
```

Rules:

- Use module code `APV`.
- Scope sequences by active branch/unit.
- Use `findTransactionNumberForCompanyBranch` plus `formatTransactionNumber` for
  `number-suggestion`.
- Use `generateTransactionNumberForCompanyBranch` inside the create transaction
  for automatic numbering.
- Pass an `isIssued(transactionNumber)` callback that checks
  `accountsPayableVoucher` uniqueness in the active company and branch.
- Let `generateTransactionNumberForCompanyBranch` increment
  `TransactionNumberSequence.currentNumber`; do not update the sequence in APV
  code separately.
- Expose `number-suggestion` for initial form display, but do not trust the
  suggestion as final during create.
- If `TransactionNumberInputMode` is `MANUAL`, require a submitted
  `transactionNo` and validate uniqueness in the active company and branch.
- If setup is missing, either surface the helper's setup error or explicitly use
  `createDefaultIfMissing: true` only if product wants APV to self-create a
  default sequence.

If APV transaction-number defaults are required for new companies, classify them
as company-owned defaults and wire them through company bootstrap, not a manual
one-off script.

## Frontend Wiring Target

Add the frontend API service:

```text
app/src/services/modules/accounts-payable/accounts-payable-voucher/AccountsPayableVoucherApi.ts
```

Update query keys:

```ts
AccountsPayableVoucherQueryKeys.all(companyId, branchUnitId)
AccountsPayableVoucherQueryKeys.list(companyId, branchUnitId, filters, pagination, sort)
AccountsPayableVoucherQueryKeys.detail(companyId, branchUnitId, id)
AccountsPayableVoucherQueryKeys.numberSuggestion(companyId, branchUnitId)
```

Add API types beside the existing UI types:

```text
app/src/types/modules/accounts-payable/accounts-payable-voucher/AccountsPayableVoucherTypes.ts
```

Add these service functions:

```ts
fetchAccountsPayableVouchers(params)
fetchAccountsPayableVoucher(id)
fetchAccountsPayableVoucherNumberSuggestion()
createAccountsPayableVoucher(values)
updateAccountsPayableVoucher(id, values)
updateAccountsPayableVoucherStatus(id, status)
```

Update:

```text
app/src/hooks/modules/accounts-payable/accounts-payable-voucher/useAccountsPayableVoucher.ts
app/src/hooks/modules/accounts-payable/accounts-payable-voucher/useAccountsPayableVoucherListPage.ts
app/src/hooks/modules/accounts-payable/accounts-payable-voucher/useAccountsPayableVoucherFormPage.ts
```

Frontend hook changes:

- Replace `MockAccountsPayableVouchers` with service calls.
- Rename frontend form/record collections from `expenseLines` to `details` and
  from `accountingEntries` to `journalEntries` during backend wiring.
- Move list search, status, date range, amount range, pagination, and sorting
  into backend query params when the endpoint supports them.
- Load detail by `recordId` instead of searching only the list cache.
- Use create/update/status React Query mutations.
- Invalidate tenant-scoped APV list/detail query keys after mutations.
- Keep frontend validation for fast UX, but treat backend validation as final.
- Keep `ModuleDataEntry` row behavior in the hook; do not move React state into
  services.

Remove or retire mock runtime usage after API wiring. Keep only pure factories,
defaults, mappers, and total helpers in `AccountsPayableVoucherData.ts` if they
still support real form behavior.

## Dependency Lookups

APV should reuse existing backend/frontend services for dropdown data rather
than duplicating lookup endpoints.

Current frontend dependencies:

- Party Name and party defaults:
  `app/src/hooks/modules/party-management/usePartyManagement.ts`
- Party accounting account options:
  `app/src/hooks/modules/party-management/usePartyManagementAccountOptions.ts`
- Terms:
  `app/src/hooks/modules/financial-maintenance/terms-maintenance/useTermDropdownOptions.ts`
- Chart of accounts:
  `app/src/services/modules/financial-maintenance/charts-of-accounts/ChartsOfAccountsApi.ts`
- Responsibility centers:
  `app/src/services/modules/financial-maintenance/responsibility-center/ResponsibilityCenterApi.ts`
- Purchase taxes:
  `app/src/services/shared/tax/TaxApi.ts`
- Tax definition default account IDs:
  `app/src/services/shared/tax/TaxDefinitionApi.ts`
- Exchange rates:
  `app/src/services/modules/system-administration/multi-currency-setup/MultiCurrencySetupService.ts`

Backend APV save logic must revalidate IDs and snapshots from these domains
against active company/branch scope.

## Migrations, Seeds, And Bootstrap

Schema changes require:

```text
gr8bookslite-backend/docs/guides/database/PRISMA_WORKFLOW.md
```

If APV adds only transaction tables, no platform seed change is required because
module code `APV` already exists in:

```text
prisma/seeds/moduleCatalog.ts
prisma/seeds/moduleSystemCatalog.ts
```

If implementation adds new permission actions, module metadata, transaction
number defaults, approval workflow templates, or form signatory defaults, classify
and wire them correctly:

- Platform metadata -> `prisma/seeds/*` and
  `prisma/provisioning/provisioning.runner.ts`.
- Company defaults -> `prisma/company-bootstrap/company-bootstrap.registry.ts`.

Do not leave required APV runtime setup in a manual-only script.

## Tests And Verification

Backend checks:

```bash
npm run typecheck
npm test -- --runInBand
node --test scripts/env/database-guard.test.cjs
node --test scripts/env/package-scripts.test.cjs
```

Add targeted backend tests for:

- Create draft APV with generated transaction number.
- Create draft APV with manual transaction number when setup allows it.
- Reject duplicate transaction number in the same company and branch.
- Reject party, term, account, or responsibility center from another company.
- Reject non-posting or inactive chart accounts.
- Reject zero exchange rate.
- Reject unbalanced journal entries.
- Reject detail total mismatch.
- Persist APV journal rows with `referenceType: "APV"` and
  `referenceId: voucher.id`.
- List search, status, date range, amount range, sorting, and pagination.
- Approve draft voucher and set approval audit fields.
- Disapprove, cancel, and undo allowed statuses.
- Reject edit when voucher is approved, cancelled, or closed.
- Reject status changes when user lacks `APV` permission.
- Confirm company/branch data does not leak across tenants.

Frontend checks after wiring:

```bash
npm run lint
npm run build
```

Manual QA:

1. Open `/accounts-payable/accounts-payable-voucher`.
2. Confirm list loads from backend with statistics.
3. Create an APV from `/add` using party, terms, credit account, details,
   VAT/EWT, and journal entries.
4. Refresh and confirm the voucher persists.
5. Edit a draft voucher and confirm detail and journal entry changes persist.
6. Approve, undo approval, disapprove, undo disapproval, cancel, and uncancel
   from the list action menu.
7. Confirm approved/cancelled/closed records are readonly where expected.
8. Switch branch/company and confirm vouchers do not leak across scopes.
9. Confirm table filters and pagination remain stable after refresh.

## Handoff Checklist

- Prisma enums/models added and validated.
- Migration created and committed.
- Backend APV module/controller/service/DTOs/mapper added.
- Backend module registered in `AppModule` or parent `AccountsPayableModule`.
- Transaction-number generation uses backend sequence setup.
- APV journal rows use shared `JournalEntry` records with
  `referenceType: "APV"`.
- Tenant and branch access checks happen server-side.
- Permissions use module code `APV`.
- Backend validates references, totals, balance, and status transitions.
- Frontend `AccountsPayableVoucherApi.ts` added using shared `ApiClient`.
- Query keys include company/branch scope, filters, pagination, and sort.
- Frontend hooks use backend queries/mutations instead of mock records.
- Mock runtime data removed or clearly retained only as development fixture.
- Backend and frontend checks pass.
