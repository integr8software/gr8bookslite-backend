# Approval Transactions Backend Integration

This document defines the backend integration contract for the frontend
Approval Transactions page. It is an implementation plan only; this change adds
no runtime backend or frontend code.

## Scope and references

Frontend route:

```text
gr8bookslite-frontend/app/(modules)/system-administration/approval-management/approval-transactions/
```

Frontend source:

```text
gr8bookslite-frontend/app/src/ui/modules/approval-management/approval-transactions/
gr8bookslite-frontend/app/src/hooks/modules/approval-management/useApprovalTransactions.ts
gr8bookslite-frontend/app/src/data/modules/approval-management/ApprovalTransactionData.ts
gr8bookslite-frontend/app/src/types/modules/approval-management/ApprovalTransactionTypes.ts
gr8bookslite-frontend/app/src/constants/modules/approval-management/ApprovalTransactionConstants.ts
gr8bookslite-frontend/app/src/services/modules/approval-management/ApprovalManagementApi.ts
```

Backend source to update:

```text
gr8bookslite-backend/src/modules/system-administration/approval-management/
  approval-management.controller.ts
  approval-management.service.ts
  dto/approval-management-response.dto.ts
  mappers/
  types/
  utils/
```

The referenced backend modularity guide exists at:

```text
gr8bookslite-backend/docs/agents/guides/ARCHITECTURE_MODULARITY_GUIDE.md
```

Follow the frontend structure and transaction guidance from:

```text
gr8bookslite-frontend/AGENTS.md
gr8bookslite-frontend/FRONTEND_TRANSACTION_MAP.md
```

## Current frontend contract

The page already calls these endpoints through
`ApprovalManagementApi.ts`:

```text
GET  /api/v1/system-administration/approval-management/modules
GET  /api/v1/system-administration/approval-management/transactions
POST /api/v1/system-administration/approval-management/transactions/:transactionId/approve
POST /api/v1/system-administration/approval-management/transactions/:transactionId/disapprove
```

Keep this API surface stable for the first backend integration unless the
frontend service is updated in the same feature branch.

The frontend expects:

```ts
type ApprovalTransactionApiRecord = {
  amount: string;
  approvers: Array<{
    approvedAt: string | null;
    name: string;
    sequence: number;
    status: string;
    userId: number;
  }>;
  blockerName?: string | null;
  canUpdateStatus: boolean;
  currentApproverId?: number | null;
  id: string;
  isSequential: boolean;
  moduleName: string;
  moduleScope: string;
  referenceNo: string;
  requestedAt: string;
  ruleId: string;
  ruleName: string;
  status: string;
};
```

`id` may be the `JournalEntryHeader.id` string for the new implementation. If
`approval_transactions` is retained as an approval-state table, the response can
continue returning that UUID, but the list itself must still be selected from
`journal_entry_header`.

## Required pending-list source

The pending approval list must be fetched from the Prisma
`JournalEntryHeader` model, which maps to the database table:

```text
journal_entry_header
```

Relevant fields from `schema.prisma`:

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
  createdAt
  updatedAt
  details
```

Current transaction modules synchronize source enum statuses to title-case
journal-entry statuses. For example, source `FOR_APPROVAL` becomes
`JournalEntryHeader.status = "For Approval"`. Query the pending list using that
stored value:

```ts
where: {
  companyId,
  status: "For Approval",
}
```

Do not build the pending list from seeded fake `approval_transactions` rows.
Remove or retire the current `ensureApprovalTransactions(companyId)` behavior
when this integration is implemented.

## Backend design

Keep Approval Transactions inside the existing System Administration approval
management module. Do not create a parallel top-level backend module.

Recommended additions inside
`src/modules/system-administration/approval-management/`:

```text
mappers/
  approval-transaction.mapper.ts
types/
  approval-transaction-source.type.ts
utils/
  approval-transaction-prisma.util.ts
  approval-status.util.ts
```

Use each layer according to the modularity guide:

- Controller owns routes, guards, throttling, and Swagger decorators only.
- Service owns tenant checks, rule resolution, approval decisions, and Prisma
  transactions.
- Mappers convert Prisma payloads to the frontend response shape.
- Utils hold repeated Prisma include/select objects and status helpers.
- DTOs describe API contracts; do not leak Prisma payloads from controllers.

## Data selection flow

`findTransactions(user)` should:

1. Resolve the active company from `AuthUser.companyId`.
2. Query `journalEntryHeader.findMany` for rows where
   `companyId = user.companyId` and `status = "For Approval"`.
3. Include only the fields needed by the approval list and preview mapper.
4. Resolve active `ApprovalRule` records where:
   `ApprovalRule.companyId = companyId`,
   `ApprovalRule.status = "Active"`,
   `ApprovalRule.moduleScope = JournalEntryHeader.referenceType`.
5. Build the approver path from the matched rule's `ApproverSetup.approvers`,
   ordered by `sequence`.
6. Merge persisted approval progress if the `approval_transactions` and
   `approval_transaction_approvers` tables remain the approval-state store.
7. Return only journal headers with a matching active approval rule and at
   least one approver.

Suggested query shape:

```ts
const headers = await this.prisma.journalEntryHeader.findMany({
  where: {
    companyId,
    status: "For Approval",
  },
  select: {
    id: true,
    referenceType: true,
    referenceId: true,
    referenceNo: true,
    transactionDate: true,
    totalDebit: true,
    totalCredit: true,
    status: true,
    createdAt: true,
    branchUnitId: true,
  },
  orderBy: [
    { transactionDate: "desc" },
    { id: "desc" },
  ],
});
```

Use `referenceType` as the approval `moduleScope`. Use `referenceNo` as the
frontend `referenceNo`; if it is null, fall back to a stable display value such
as `JE-${jeno}`.

Use `totalDebit` as the default list amount unless a module-specific resolver
provides a better control amount. Journal-entry validation requires debit and
credit to balance, so either total is acceptable for generic approval list
display when no source-transaction amount rule exists.

For APV records, do not use the journal header total for the approval amount.
When `JournalEntryHeader.referenceType = "APV"`, resolve the source transaction
through:

```text
accounts_payable_vouchers.apv_id = JournalEntryHeader.referenceId
accounts_payable_vouchers.company_id = JournalEntryHeader.companyId
```

Then use:

```text
AccountsPayableVoucher.amount
```

This Prisma field maps to `accounts_payable_vouchers.amount` in the database.

## Approval rule matching

Approval Management workflows are stored in:

```text
approval_rules
approver_setups
approver_setup_users
```

Match a pending journal header to a rule by company and module code:

```text
ApprovalRule.companyId = JournalEntryHeader.companyId
ApprovalRule.moduleScope = JournalEntryHeader.referenceType
ApprovalRule.status = "Active"
```

Amount-based rules should compare against the same amount selected for display:
`AccountsPayableVoucher.amount` for APV rows, otherwise the generic journal
header amount, normally `JournalEntryHeader.totalDebit`.

If multiple active rules match the same module, choose the first matching
amount rule using the established approval-management ordering. If no amount
rule matches, use the default/otherwise rule. If there is no active rule, do
not show the journal header in Approval Transactions.

## Approval state storage

The pending source is `journal_entry_header`, but approver progress still needs
a durable state record.

Preferred first integration:

- Keep `approval_transactions` as the approval progress table.
- Create or upsert approval progress only for real pending
  `JournalEntryHeader` rows.
- Do not create placeholder approval transactions from active rules alone.
- Enforce that every `approval_transactions` row maps back to a current
  journal header by `companyId`, `moduleScope = referenceType`, and
  `referenceNo`.

If a future migration replaces `approval_transactions`, introduce a new
journal-header approval state model in Prisma and update this document before
changing the API.

## Approval and disapproval actions

The action endpoints must validate against the journal header source before
changing approval state:

1. Load the target journal header in the current company.
2. Reject if `JournalEntryHeader.status` is not `"For Approval"`.
3. Resolve the active approval rule and approval path for the header.
4. Reject if the current user is not an approver for that rule.
5. For sequential rules, reject if an earlier approver is still pending.
6. Update the current approver state.
7. If disapproved, set approval state to `Disapproved` and synchronize the
   journal header and source transaction to disapproved status.
8. If all approvers have approved, set approval state to `Approved` and apply
   the owning transaction module's approved/posted transition.
9. Return the same `ApprovalTransactionApiRecord` shape.

Do not update only `approval_transactions` while leaving
`journal_entry_header.status` as `"For Approval"`. The list source would keep
showing an already completed item.

Approval and disapproval should be applied in one short Prisma transaction for
local database writes. If an owning module requires a service-level status
transition, introduce a small resolver/strategy per `referenceType` so each
module keeps its own status rules and audit behavior.

## Source transaction synchronization

`JournalEntryHeader.referenceType` identifies the owning transaction module,
and `referenceId` points to the source transaction primary key.

Known reference types already used by backend services include:

```text
APV  Accounts Payable Voucher
JV   Journal Voucher
SI   Service Invoice
OR   Official Receipt
CR   Collection Receipt
AR   Acknowledgement Receipt
PVR  Provisional Receipt
BI   Billing Invoice
BILL Billing
BS   Billing Statement
```

Approval Management should not duplicate each module's status rules. Add a
module-local source resolver only when needed:

```ts
type ApprovalTransactionSourceResolver = {
  referenceType: string;
  approve(input: ApprovalTransactionSourceInput): Promise<void>;
  disapprove(input: ApprovalTransactionSourceInput): Promise<void>;
  getPreviewHref?(input: ApprovalTransactionSourceInput): string;
};
```

Each resolver should call or reuse the owning module service/status-transition
logic where possible. If a resolver is not available for a reference type, the
backend should either hide that header from the approval list or return a clear
server-side error when actioning it. Do not silently mark approval complete
without synchronizing the source transaction.

## Response mapping

Map journal-header-backed approvals as follows:

```text
id                JournalEntryHeader.id as string, or approval_transactions.id if retained
moduleScope       JournalEntryHeader.referenceType
moduleName        ApprovalRule.moduleName, fallback to module catalog name, fallback to referenceType
referenceNo       JournalEntryHeader.referenceNo, fallback to JE-{jeno}
requestedAt       JournalEntryHeader.createdAt or transactionDate
amount            AccountsPayableVoucher.amount.toString() for APV, otherwise JournalEntryHeader.totalDebit.toString()
status            Approval progress status, fallback to JournalEntryHeader.status
ruleId            ApprovalRule.id
ruleName          ApprovalRule.routeName
isSequential      Existing rule behavior, currently ruleType === "amount"
approvers         Approval path with persisted statuses and approvedAt values
currentApproverId First pending approver for sequential rules, or current user's pending approver row when applicable
canUpdateStatus   True only when the current user may act now
blockerName       Earlier pending approver name for sequential blocking
```

Normalize dates to JSON-safe strings through the mapper. Normalize Decimal and
BigInt values before returning them; controllers should not return raw Prisma
objects.

## Frontend follow-up after backend wiring

The current frontend can keep its route and visual components. Backend wiring
should verify these frontend details:

- `GetApprovalTransactions()` continues to use the shared API client.
- `ApprovalManagementQueryKeys.transactions()` is invalidated after approve or
  disapprove.
- `ApprovalTransactionApiRecord.id` matches the backend action endpoint
  identifier.
- Mock or seed-only assumptions are removed from the backend; the frontend
  should not receive records absent from `journal_entry_header`.
- Date and amount formatting should eventually move to existing shared
  utilities if this module is touched for frontend cleanup.

Docs-only changes do not require frontend lint or build.

## Verification checklist

Backend tests should cover:

- `GET /transactions` returns only current-company
  `journal_entry_header.status = "For Approval"` rows.
- Headers without active approval rules are excluded.
- Headers with active rules and approvers map to the frontend response shape.
- Amount-rule matching uses `accounts_payable_vouchers.amount` for APV rows and
  the journal header amount for non-APV rows.
- Sequential approval blocks later approvers until earlier approvers approve.
- Non-approvers cannot approve or disapprove.
- Approved transactions disappear from the pending list after the final
  approval.
- Disapproved transactions disappear from the pending list immediately.
- Journal header status and source transaction status are synchronized with
  approval progress.
- Tenant isolation prevents users from seeing or actioning another company's
  journal headers.

Run the relevant backend typecheck and tests after implementation. Run frontend
lint/build only when frontend files are changed.
