# Accounting Entries

This is the shared implementation guide for modules that collect, validate, or
persist accounting entries. Use it for any module that exposes frontend
`accountingEntries` and persists backend journal rows.

Module-specific documents should link to this guide and keep only their own
reference type, source transaction, total-control rules, and UI variations in
their module folder.

## Naming Contract

Use these names consistently:

```text
Frontend form state: accountingEntries
Backend API payload: journalEntries
Database header: journal_entry_header
Database lines: journal_entry_detail
```

The API adapter for each module owns the mapping from `accountingEntries` to
`journalEntries`. UI components should not need to know database field names.

## Shared Database Shape

Journal entry headers own transaction-level accounting metadata:

```text
JournalEntryHeader
  id
  jeno
  companyId
  branchUnitId
  referenceType
  referenceId
  referenceNo
  transactionDate
  currencyCode
  exchangeRate
  particulars
  totalDebit
  totalCredit
  status
```

Journal entry details own line-level accounting rows:

```text
JournalEntryDetail
  id
  companyId
  jeno
  lineNumber
  accountId
  accountCodeSnapshot
  accountTitleSnapshot
  debit
  credit
  vatType
  atcCode
  partyCodeSnapshot
  partyNameSnapshot
  responsibilityCenterId
  responsibilityCenterSnapshot
  refNo
```

`JournalEntryHeader.jeno` is the journal entry number and is unique per
`companyId`.

`JournalEntryDetail` links to its header through `companyId + jeno`. Do not
reintroduce module-specific `journalEntryHeaderId` relations for transaction
journal rows.

## Reference Contract

Every module that writes journal entries must define:

```text
referenceType: stable short module code, such as "APV"
referenceId: source transaction primary key
referenceNo: optional display/reference number from the source transaction
```

Non-normative examples:

```text
APV referenceType: "APV"
APV referenceId: AccountsPayableVoucher.apvId
```

Each module should document its own `referenceType` and `referenceId` in its
module-specific guide.

## API Payload Shape

Use this shape as the shared journal-entry payload target unless a module has a
clear reason to extend it:

```ts
type JournalEntryPayload = {
  referenceType?: string | null;
  lineNumber: number;
  accountId?: string | null;
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

Recommended DTO rules:

- `referenceType` is optional in client payloads only when the backend can infer
  it from the module route.
- `lineNumber` must be an integer greater than or equal to `1`.
- `accountCode`, `accountTitle`, `currencyCode`, `debit`, and `credit` are
  required.
- `exchangeRate` must be greater than zero.
- `debit` and `credit` cannot be negative.
- Optional snapshot fields should have database-aligned max lengths.

## Frontend Mapping Rules

Each module API adapter should:

- Map frontend `accountingEntries` to backend `journalEntries`.
- Default `referenceType` to the module reference type when the row omits it.
- Trim account and snapshot text.
- Convert empty optional strings to `null` in payloads.
- Default line currency and exchange rate from the transaction header when
  missing.
- Map backend nullable strings to empty strings for editable UI fields.
- Convert decimal database values to numbers for UI state.

Keep this mapping in the module service/API adapter. Do not spread backend enum
or database naming across UI components.

## Validation Rules

Backend validation is authoritative. Frontend validation should mirror it for
fast feedback, but backend services must enforce the final rules.

Shared row rules:

- At least two journal entry rows are required for a balanced transaction.
- A line cannot have both debit and credit greater than zero.
- A line must have either debit or credit greater than zero.
- Line currency must match the source transaction currency unless the module
  explicitly supports multi-currency lines.
- Line exchange rate must match the source transaction exchange rate unless the
  module explicitly supports line-level exchange rates.
- Posting account must resolve to an active company chart account.
- Responsibility center, when supplied, must resolve to an active company
  responsibility center.

Shared total rules:

- Total debit must equal total credit.
- Journal totals must match the module-defined control amount.

The control amount is module-specific. Each module must document the source of
truth that journal totals must match, such as a voucher gross amount, invoice
total, payment amount, adjustment amount, or another transaction total.

## Journal Number Allocation

When a module creates a `JournalEntryHeader`, it must allocate `jeno` per
company.

Implemented modules currently use this service-side allocator pattern:

1. Build a company-scoped Postgres advisory transaction lock key.
2. Call `pg_advisory_xact_lock`.
3. Read max `JournalEntryHeader.jeno` for the company.
4. Insert max + 1, or `1` for the first company journal entry.

This pattern is necessary because Prisma does not support an autoincrement
default that resets per `companyId`.

If a shared journal-entry service is introduced, move this allocator there and
have all modules call it.

## Persistence Flow

Recommended transaction flow for modules with accounting entries:

1. Normalize source transaction header input.
2. Validate source transaction detail rows and accounting entries.
3. Resolve posting accounts and responsibility centers.
4. Delete existing journal headers for this `referenceType + referenceId` when
   replacing entries.
5. Calculate total debit and credit.
6. Allocate the next per-company `jeno`.
7. Create `JournalEntryHeader`.
8. Create nested `JournalEntryDetail` rows.
9. Reload the source transaction and attach journal entries for the response
   mapper.

The owning module service may perform these steps directly. Prefer a shared
journal-entry service once two or more modules need the same persistence flow.

## Response Mapping

Modules should attach journal entries by reading headers through:

```text
referenceType = module reference type
referenceId IN source transaction ids
```

Include details ordered by `lineNumber`, then flatten required header metadata
onto the returned row shape:

- `currencyCode`
- `exchangeRate`
- `particulars`
- `referenceId`
- `referenceNo`
- `referenceType`

The module mapper should expose frontend-friendly row fields and convert
database decimals to numbers.

## Frontend Table Behavior

The standard accounting-entry table shape is:

```text
accountCode
accountTitle
debit
credit
partyCode
partyName
particulars
vatType
atcCode
responsibilityCenter
refNo
```

Modules may hide or rename columns if the workflow requires it, but the API
adapter should still map to the shared journal-entry payload.

Frontend validation should cover:

- At least two accounting rows.
- Account code and account title required.
- Debit and credit cannot be negative.
- A row needs either debit or credit.
- A row cannot use both debit and credit.
- Total debit and total credit variance must be zero.
- Accounting totals must match the module-defined control amount.

## Maintenance Rules

- Keep module accounting validation in a module service or shared accounting
  service, not in controllers.
- Keep rounding and amount comparison helpers shared or module-local utilities,
  not inline in controllers or React components.
- Keep UI/API mapping in module API adapters.
- Keep table interaction logic in module UI/hook files.
- Keep backend enum and database names out of UI components.
- Do not reintroduce `journalEntryHeaderId` for module transaction journal
  detail relations.
- Document module-specific reference type, source transaction id, and control
  amount in the module-specific guide.
