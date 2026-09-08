# Copy From Workflow Contract

## 1. Purpose

Copy From lets a target transaction reuse data from an upstream source transaction without retyping headers, party details, line items, amounts, or accounting references.

This is a convenience feature in the frontend, but it is a data-integrity feature in the backend. The backend is always the final authority.

Generic examples:

| Source | Target | Common Rule |
| --- | --- | --- |
| `<SourceModule>` | `<TargetModule>` | Copy source header and detail lines into the target transaction. |
| `<SourceModule>` | `<TargetModule>` | Consume source quantity by target line quantity. |
| `<SourceModule>` | `<TargetModule>` | Consume source amount by target allocation amount. |

## 2. Core Rule

Do not model Copy From as only "consumed" or "unconsumed" unless the business process is truly one-to-one.

Most transaction flows need an available balance or available quantity rule.

Example:

- `<SourceModule>` total amount: 5000
- `<TargetModule>` copied amount: 3000
- `<SourceModule>` remaining amount: 2000
- The `<SourceModule>` record must still appear as available for Copy From with only 2000 available.
- A later `<TargetModule>` cannot copy more than the remaining 2000.

The same principle applies to item quantities:

- `<SourceModuleLine>` quantity: 10
- `<TargetModuleLine>` copied quantity: 6
- `<SourceModuleLine>` remaining quantity: 4
- The `<SourceModuleLine>` remains available until the remaining quantity is 0.

## 3. Frontend vs Backend Responsibilities

### Frontend Responsibilities

The frontend prevents ordinary user mistakes before Save:

- Filter the Copy From modal by source, search, date, party, amount, and remaining balance.
- Hide or disable fully consumed source records.
- Show remaining amount or remaining quantity when the source can be partially consumed.
- Auto-fill target header fields when the target header is empty.
- Prevent obvious invalid multi-select combinations, such as different parties or currencies when the workflow requires one party.
- Give fast feedback through disabled rows, inline messages, and toasts.

Frontend checks are for user experience only. They are not enough to protect the database.

### Backend Responsibilities

The backend protects data integrity on every create and update:

- Recalculate source availability from the database inside the save transaction.
- Reject stale browser data, race conditions, and direct API requests.
- Verify tenant and branch scope.
- Verify source status, such as APPROVED or POSTED.
- Verify source is not deleted or cancelled.
- Verify source party and currency match the target when the workflow requires it.
- Verify copied amount or quantity does not exceed the current remaining balance.
- Persist source references at the correct level: header, line, or allocation.
- Release or recalculate source usage when a target transaction is cancelled, disapproved, deleted, or edited.

## 4. Source Consumption Types

Every Copy From source-to-target pair must declare one consumption type.

| Type | Meaning | Example | Availability Rule |
| --- | --- | --- | --- |
| Header once | The source can be used by only one active target. | `<SourceModule>` converted to one `<TargetModule>`. | Hide source after any active target references it. |
| Header amount balance | The source has a total amount that can be used across multiple active targets. | `<SourceModule>` paid or settled by multiple `<TargetModule>` records. | Available amount = source total - active copied amount. |
| Line quantity balance | Each source line has a quantity that can be consumed by target lines. | `<SourceModuleLine>` copied to one or more `<TargetModuleLine>` records. | Available quantity = source line qty - active copied qty. |
| Line amount balance | Each source line has an amount that can be consumed by target lines. | `<SourceModuleLine>` settled by one or more `<TargetModuleLine>` records. | Available amount = source line amount - active copied amount. |

Avoid using a simple `none` relation exclusion for amount or quantity flows. It incorrectly removes partially available source records.

## 5. Party Name Restriction

Party restriction is configurable per target workflow.

| Setting | Behavior |
| --- | --- |
| `restrictByParty: true` | The target can copy only source transactions for the same party. |
| `restrictByParty: false` | The target can copy across parties if the business workflow allows it. |

### When Party Name is Empty

If the target header Party Name is empty:

- Show all currently available source transactions allowed by the workflow.
- When the user applies a source, auto-fill party identity and display fields from the selected source.
- For multi-select with `restrictByParty: true`, the first selected source locks the selection to that party.

Required copied party fields:

- `partyId`
- `partyCode`
- `partyName`
- address/contact snapshots when relevant
- terms when relevant
- currency and exchange rate when relevant

### When Party Name is Already Selected

If the target header Party Name is already selected and `restrictByParty: true`:

- The modal must show only source transactions with the same party identity.
- The backend must reject submitted source references from another party.
- Applying Copy From must preserve the selected target party.

Prefer matching by stable identity in this order:

1. `partyId`
2. `partyCodeSnapshot`
3. normalized party name only as display fallback

Do not rely on Party Name alone for backend validation.

## 6. Single Select vs Multiple Select

Every Copy From action must declare its selection mode.

| Mode | Use When | UI Rule | Backend Rule |
| --- | --- | --- | --- |
| `single` | The target should come from one source transaction only. | Radio selection. | Reject more than one source reference. |
| `multiple` | The target may combine source transactions. | Checkbox selection. | Validate every selected source and every copied amount/quantity. |

Multi-select must also declare grouping rules:

| Rule | Required When |
| --- | --- |
| Same party | One target transaction has one party, such as vendor, customer, employee, or payee. |
| Same currency | The target header has one currency and exchange rate. |
| Same branch | The target cannot combine source transactions across branches. |
| Same source type | Mixing source modules would create ambiguous line/accounting behavior. |

For example, a target workflow with one party and one currency should require same party and same currency. A target with empty Party Name may show all available source transactions, but once the first source transaction is selected, the remaining selectable source transactions should be limited to that same party and currency.

## 7. Recommended API Shape

Each target/source pair should expose a specific availability endpoint instead of relying on the full list endpoint.

Example:

```http
GET /api/v1/<source-module>/copy-from/<target-module>-candidates
```

Query parameters:

```typescript
type CopyFromCandidateQuery = {
  branchUnitId?: number;
  partyId?: string;
  partyCode?: string;
  search?: string;
  page?: number;
  limit?: number;
};
```

Candidate response:

```typescript
type CopyFromCandidateRecord = {
  id: string;
  source: string;
  sourceNo: string;
  documentDate: string;
  partyId?: string;
  partyCode?: string;
  partyName?: string;
  currency: string;
  originalAmount?: string;
  consumedAmount?: string;
  availableAmount?: string;
  originalQuantity?: string;
  consumedQuantity?: string;
  availableQuantity?: string;
  remarks?: string;
  disabledReason?: string;
  details?: CopyFromSourceDetailRecord[];
  extra?: Record<string, string | number | boolean | null>;
};

type CopyFromSourceDetailRecord = {
  id: string;
  lineNumber: number;
  sourceLineId?: string;
  accountId?: string;
  accountCode?: string;
  accountTitle?: string;
  expenseType?: string;
  amount?: string;
  netAmount?: string;
  vatType?: string;
  vatCode?: string;
  vatPercent?: string;
  vatAmount?: string;
  ewtCode?: string;
  ewtPercent?: string;
  ewtAmount?: string;
  disburseAmount?: string;
  partyId?: string;
  partyCode?: string;
  partyName?: string;
  particulars?: string;
  responsibilityCenterId?: string;
  responsibilityCenter?: string;
  referenceNo?: string;
};
```

The frontend may still map this into the shared `AppCopyFromRecord` display type, but the workflow hook should keep the extra fields needed for validation and Apply behavior.

### Field Variability

Not every source module has the same fields. Some sources do not have party, currency, quantity, amount, terms, or address data. Some sources have additional fields that only matter for one target workflow.

That is acceptable. Copy From should use a common base candidate shape plus workflow-specific field requirements.

Each workflow definition must declare which fields are required, optional, and extra:

```typescript
type CopyFromWorkflowFieldDefinition = {
  requiredFields: Array<
    | 'partyId'
    | 'partyCode'
    | 'partyName'
    | 'currency'
    | 'originalAmount'
    | 'consumedAmount'
    | 'availableAmount'
    | 'originalQuantity'
    | 'consumedQuantity'
    | 'availableQuantity'
  >;
  optionalFields: string[];
  extraFields: string[];
};
```

Rules:

- A missing field is valid when the workflow does not require it.
- A missing field is invalid when the workflow declares it as required.
- Extra fields are valid when the target workflow knows how to display, copy, or validate them.
- The frontend may show workflow-specific columns, but the backend must still validate the required fields during save.

## 8. Recommended File Structure

Use one shared Copy From module for routing and orchestration, and keep source/target business rules close to the owning transaction modules.

Do not put every rule into one giant config map. A small registry is fine, but the actual logic should live in adapters/services that can be tested per workflow.

One target module may support many Copy From sources, and those sources may represent different business processes. Do not assume that every source copied into the same target follows the same consumption, party, currency, or validation rule. Treat each `sourceModule + targetModule` pair as its own workflow.

### Backend

```text
src/modules/
├── copy-from/
│   ├── copy-from.module.ts
│   ├── copy-from.controller.ts
│   ├── copy-from.service.ts
│   ├── copy-from.registry.ts
│   ├── dto/
│   │   ├── get-copy-from-candidates-query.dto.ts
│   │   ├── copy-from-candidate.dto.ts
│   │   └── copy-from-source-detail.dto.ts
│   ├── interfaces/
│   │   ├── copy-from-adapter.interface.ts
│   │   ├── copy-from-consumption.type.ts
│   │   └── copy-from-workflow-definition.type.ts
│   └── utils/
│       ├── copy-from-pagination.util.ts
│       ├── copy-from-party-match.util.ts
│       └── copy-from-amount.util.ts
│
├── <source-domain>/
│   └── <source-module>/
│       ├── <source-module>.service.ts
│       ├── <source-module>.controller.ts
│       ├── <source-module>.module.ts
│       └── copy-from/
│           ├── <source-module>-copy-source.adapter.ts
│           └── <source-module>-copy-source.adapter.spec.ts
│
└── <target-domain>/
    └── <target-module>/
        ├── <target-module>.service.ts
        ├── <target-module>.controller.ts
        ├── <target-module>.module.ts
        └── copy-from/
            ├── <target-module>-copy-target.service.ts
            ├── <target-module>-copy-target.service.spec.ts
            └── <target-module-source-allocation>.service.ts
```

### Backend Ownership

| File | Responsibility |
| --- | --- |
| `copy-from.controller.ts` | Exposes shared Copy From endpoints. It should stay thin. |
| `copy-from.service.ts` | Dispatches requests to the registered workflow adapter. |
| `copy-from.registry.ts` | Maps `sourceModule + targetModule` to the correct adapter. |
| `<source-module>-copy-source.adapter.ts` | Knows how to query source candidates and calculate remaining source availability. |
| `<target-module>-copy-target.service.ts` | Knows how to validate and apply copied references during target create/update. |
| `<target-module-source-allocation>.service.ts` | Owns amount/quantity allocation persistence and consumed-balance calculations. |

The registry key must include both source and target. Registering by source only is not enough because the same source may behave differently when copied into different targets, and the same target may accept sources from unrelated processes.

### Adapter Interface

```typescript
export type CopyFromWorkflowDefinition = {
  sourceModule: string;
  targetModule: string;
  selectionMode: 'single' | 'multiple';
  consumptionType: 'header_once' | 'header_amount_balance' | 'line_quantity_balance' | 'line_amount_balance';
  restrictByParty: boolean;
  restrictByCurrency: boolean;
  restrictByBranch: boolean;
  requiredFields: string[];
  optionalFields: string[];
  extraFields: string[];
};

export interface CopyFromAdapter {
  readonly workflow: CopyFromWorkflowDefinition;

  findCandidates(
    user: AuthUser,
    query: GetCopyFromCandidatesQueryDto,
  ): Promise<CopyFromCandidateListResponseDto>;

  findSourceDetail(
    user: AuthUser,
    sourceId: string,
    query: GetCopyFromSourceDetailQueryDto,
  ): Promise<CopyFromSourceDetailResponseDto>;
}
```

### Frontend

```text
app/src/
├── services/shared/copy-from/
│   ├── CopyFromApi.ts
│   ├── CopyFromQueryKeys.ts
│   └── CopyFromTypes.ts
│
├── hooks/shared/copy-from/
│   ├── useCopyFromCandidates.ts
│   ├── useCopyFromSelection.ts
│   └── useCopyFromApplyGuard.ts
│
├── ui/shared/transaction-setup/
│   ├── AppCopyFromDropdown.tsx
│   ├── AppCopyFromSourceDialog.tsx
│   └── AppCopyFromAllocationTable.tsx
│
└── hooks/modules/<target-domain>/<target-module>/
    └── use<TargetModule>CopyFrom.ts
```

### Frontend Ownership

| File | Responsibility |
| --- | --- |
| `CopyFromApi.ts` | Calls the shared backend Copy From endpoints. |
| `CopyFromQueryKeys.ts` | Provides stable TanStack Query keys by source, target, branch, party, and filters. |
| `useCopyFromCandidates.ts` | Loads candidate rows from the backend. |
| `useCopyFromSelection.ts` | Handles single/multiple select, same-party lock, same-currency lock, and selected totals. |
| `AppCopyFromDropdown.tsx` | Shared UI shell for choosing source modules and opening the modal. |
| `AppCopyFromSourceDialog.tsx` | Shared candidate table, filters, pagination, and Apply button. |
| `AppCopyFromAllocationTable.tsx` | Shared editable allocation rows for partial amount/quantity workflows. |
| `use<TargetModule>CopyFrom.ts` | Module-specific Apply mapping into the target form values. |

### Endpoint Shape

```http
GET /api/v1/copy-from/candidates?sourceModule=<source-module>&targetModule=<target-module>
GET /api/v1/copy-from/sources/:sourceId?sourceModule=<source-module>&targetModule=<target-module>
```

The shared endpoint is easier for the frontend because every target form can call the same service. The backend registry still routes the request to the correct source adapter.

## 9. Backend Save-Time Guard

Every target create/update that accepts Copy From references must run a save-time guard inside the database transaction.

Example for `<SourceModule>` to `<TargetModule>` amount balance:

```typescript
async function assertSourceAmountAvailableForTarget(
  tx: Prisma.TransactionClient,
  input: {
    companyId: number;
    branchUnitId: number;
    partyId: bigint;
    currency: string;
    sourceId: bigint;
    requestedAmount: Prisma.Decimal;
    currentTargetId?: bigint;
  },
) {
  const source = await tx.<sourceModel>.findFirst({
    where: {
      id: input.sourceId,
      companyId: input.companyId,
      branchUnitId: input.branchUnitId,
      deletedAt: null,
      status: { in: ['APPROVED', 'POSTED'] },
    },
    select: {
      id: true,
      partyId: true,
      partyCodeSnapshot: true,
      partyNameSnapshot: true,
      currencyCode: true,
      totalAmount: true,
    },
  });

  if (!source) {
    throw new BadRequestException('Select a valid source transaction.');
  }

  if (source.partyId !== input.partyId) {
    throw new BadRequestException('The selected source transaction belongs to a different Party Name.');
  }

  if (source.currencyCode !== input.currency) {
    throw new BadRequestException('The selected source transaction uses a different currency.');
  }

  const consumed = await tx.<targetSourceAllocationModel>.aggregate({
    where: {
      sourceId: input.sourceId,
      target: {
        companyId: input.companyId,
        deletedAt: null,
        status: { notIn: ['CANCELLED', 'DISAPPROVED'] },
        ...(input.currentTargetId ? { NOT: { id: input.currentTargetId } } : {}),
      },
    },
    _sum: { amount: true },
  });

  const consumedAmount = consumed._sum.amount ?? new Prisma.Decimal(0);
  const availableAmount = source.totalAmount.minus(consumedAmount);

  if (input.requestedAmount.gt(availableAmount)) {
    throw new BadRequestException(
      `Source transaction ${source.id.toString()} has only ${availableAmount.toFixed(2)} available.`,
    );
  }
}
```

Use the actual target allocation/detail table names for each module. If the current schema does not have an allocation table, add one when partial amount consumption is required. Do not parse comma-separated reference numbers to calculate consumption.

## 10. Data Modeling Recommendation

Use explicit reference fields for Copy From. Do not depend on text fields like `referenceNo`, source number text, or comma-separated transaction numbers as the source of truth.

Recommended patterns:

### Header Once

```prisma
sourceDocumentId BigInt?
sourceDocument   SourceDocument? @relation(fields: [sourceDocumentId], references: [id], onDelete: Restrict)
```

### Line Quantity Balance

```prisma
sourceLineId BigInt?
sourceLine   SourceLine? @relation(fields: [sourceLineId], references: [id], onDelete: Restrict)
quantity     Decimal     @db.Decimal(18, 6)
```

### Amount Balance

Preferred when the schema needs a clean many-to-many allocation ledger:

```prisma
model <TargetSourceAllocation> {
  id             BigInt  @id @default(autoincrement())
  targetId       BigInt  @map("target_id")
  sourceId       BigInt  @map("source_id")
  amount         Decimal @db.Decimal(18, 2)

  target         <TargetModule> @relation(fields: [targetId], references: [id], onDelete: Cascade)
  source         <SourceModule> @relation(fields: [sourceId], references: [id], onDelete: Restrict)

  @@index([sourceId])
  @@index([targetId])
}
```

This makes `<SourceModule>` 5000, `<TargetModule>` 3000, remaining 2000 easy to query and safe under concurrency.

If the existing target detail table already has stable source reference and amount fields, a new allocation table is not required for the first implementation. In that case, the target detail table itself is the allocation ledger.

Required target detail fields:

- `refId` stores the source primary key, not the display transaction number.
- `grossAmount` or equivalent stores the gross amount consumed from the source.
- `grossAmount`, `vatAmount`, `ewtAmount`, and `netAmount` may store accounting/tax presentation amounts, but they must not be the only source-consumption basis when the source balance is payable amount.
- Target header `referenceModule` identifies the copied source module.

Availability must be calculated from active target detail rows:

```typescript
availableGrossAmount = source.grossAmount - sum(activeTargetDetails.grossAmount where refId = source.id)
availableAmount = source.totalPayable - sum(activeTargetDetails.disburseAmount where refId = source.id)
```

Cancelled, disapproved, deleted, or edited-away target rows must not consume source availability.

## 11. Frontend Apply Contract

When the user applies Copy From, the form hook should update the target form in one place.

For empty Party Name:

- Copy party identity and display fields from the first selected source.
- Copy currency and exchange rate from the first selected source.
- Copy terms, address, and contact snapshots when relevant.

For selected Party Name:

- Preserve the current party fields.
- Append or replace target lines according to the module rule.
- Reject or disable mismatched source rows before Apply.

For partial amount flows:

- Default copied amount to the source available amount.
- Allow the user to reduce the copied amount when partial amount consumption is allowed.
- Never allow the user to enter more than available amount.
- If source detail lines include tax data, copy the source detail line fields first, then scale the amounts proportionally when the source is only partially available.
- Save the source primary key on every copied target detail row so the backend can recalculate remaining balance without reading display reference text.

For partial quantity flows:

- Default copied quantity to the source available quantity.
- Allow reducing the copied quantity when partial quantity consumption is allowed.
- Never allow more than available quantity.

## 12. Developer Checklist

Before releasing a Copy From workflow, verify all items below.

- The source-to-target pair declares consumption type: header once, header amount balance, line quantity balance, or line amount balance.
- The source-to-target pair declares `selectionMode`.
- The source-to-target pair declares whether `restrictByParty` is enabled.
- The candidate endpoint calculates current remaining amount or quantity from active target references.
- The save endpoint recalculates availability inside the same database transaction that creates or updates the target.
- Cancelled, disapproved, deleted, or superseded targets do not consume source availability.
- Edited targets exclude their own previous allocations when recalculating availability.
- Backend validation uses stable IDs or codes, not Party Name text alone.
- Frontend filtering mirrors backend rules but is not treated as authority.
- Tests cover race/stale-data behavior by attempting to save more than the remaining amount or quantity.

## 13. Accounts Payable Voucher to Cash/Disbursement Voucher

This workflow uses the standard structure: the source owns candidate availability, and the target owns Apply behavior.

| Property | Rule |
| --- | --- |
| Source | Accounts Payable Voucher |
| Target | Cash Voucher or Disbursement Voucher |
| Selection mode | Multiple |
| Consumption type | Header amount balance |
| Party restriction | Same party required when the target header has Party Name. Empty Party Name may show all available APVs, but selected APVs must still share one party. |
| Currency restriction | Same currency required. |
| Branch restriction | Same active branch required. |
| New allocation table | Not required for the current schema because CV/DV detail rows already store `refId`, tax amounts, and `disburseAmount`. |

### Candidate Rules

The APV candidate endpoint must return only copyable APVs:

- Same company and active branch.
- Not deleted.
- Approved/posted APV status only.
- Same party when the target passed a party filter.
- `availableAmount > 0`.

The APV candidate must include both header balance fields and detail lines:

```typescript
type AccountsPayableVoucherCopyCandidate = {
  id: string; // APV primary key
  transactionNo: string;
  partyId?: string;
  partyCode: string;
  partyName: string;
  currency: string;
  exchangeRate: number;
  amount: number; // Original gross amount: sum(details.amount)
  consumedGrossAmount: number; // Gross already copied to active targets
  availableGrossAmount: number; // Remaining gross amount
  consumedAmount: number; // Payable/disburse amount already copied
  availableAmount: number; // Remaining payable/disburse amount
  totalPayable: number; // Original payable amount after VAT/EWT deductions
  details: Array<{
    id: string;
    lineNumber: number;
    expenseAccountId?: string;
    expenseAccountCode: string;
    expenseType: string;
    amount: number;
    netAmount: number;
    vat?: string;
    vatPercent: number;
    vatAmount: number;
    ewt?: string;
    ewtPercent: number;
    ewtAmount: number;
    totalAmountDue: number;
    particulars?: string;
    responsibilityCenterId?: string;
    responsibilityCenter?: string;
    referenceNo?: string;
  }>;
};
```

### Apply Mapping

When APV is copied into CV/DV:

- Target header `referenceModule` becomes `Accounts Payable Voucher`.
- Target header `voucherReferenceNo` stores `APV:<transactionNo>` for display.
- Target party, currency, exchange rate, project, and remarks are copied only when the target header is empty.
- Target detail `refId` stores the public reference `APV:<transactionNo>`. Existing numeric references remain readable for backward compatibility but must not be created by new clients.
- Target detail expense/account fields come from the APV detail line.
- Target detail VAT Type comes from the APV detail VAT field.
- Target detail EWT Code comes from the APV detail EWT field.
- Target detail amount fields come from the APV detail amounts.
- Target detail `disburseAmount` or equivalent payable amount comes from APV detail `totalAmountDue`.

Example:

```typescript
target.referenceModule = 'Accounts Payable Voucher';
target.voucherReferenceNo = `APV:${apv.transactionNo}`;

targetDetail.refId = `APV:${apv.transactionNo}`;
targetDetail.accountCode = apvDetail.expenseAccountCode;
targetDetail.accountTitle = apvDetail.expenseType;
targetDetail.grossAmount = apvDetail.amount;
targetDetail.netAmount = apvDetail.netAmount;
targetDetail.vatCode = apvDetail.vat;
targetDetail.vatAmount = apvDetail.vatAmount;
targetDetail.ewtCode = apvDetail.ewt;
targetDetail.ewtAmount = apvDetail.ewtAmount;
targetDetail.disburseAmount = apvDetail.totalAmountDue;
```

The Copy From response must keep gross and payable amounts separate:

- `amount` is the original APV gross amount from the sum of APV detail `amount`.
- `availableGrossAmount` is the gross amount still available to copy.
- `totalPayable` is the original APV payable amount after VAT/EWT deductions.
- `availableAmount` is the payable/disburse amount still available.

If APV gross amount is 5000 and total payable is 4850, copying 3000 gross proportionally consumes 2910 payable. The next Copy From response must show `availableGrossAmount = 2000` and `availableAmount = 1940`. If the APV has multiple detail lines and only a partial gross amount is available, the frontend should scale gross, VAT, EWT, net, and payable detail amounts by the same gross availability ratio unless a dedicated allocation UI lets the user choose exact line amounts.

The CV/DV voucher amount must match the payable amount being disbursed now. For example, an APV with gross amount 5000 and total payable 4850 can produce a CV/DV payment of 4850 while consuming 5000 gross, leaving both available balances at zero.

At submission, derive `<target>.amount` from the sum of editable detail `disburseAmount` values. Do not submit a cached gross total as the payment amount. Exclude generated accounting counterparts from this sum. Backend partial-payment normalization and accounting validation must identify the same source detail rows, including older payloads without generated row IDs. Keep the equality check between the submitted payment amount and its detail total; check the remaining `<source>` balance separately inside the save transaction.

### Save-Time Guard

CV/DV create and update must validate copied APV rows inside the database transaction:

- Lock each referenced APV before checking remaining balance.
- Re-read APV status, company, branch, party, currency, and amount.
- Sum existing active CV/DV details where `referenceModule = Accounts Payable Voucher` and `refId = apv.id`.
- Use `grossAmount` as the APV consumption amount. Keep `disburseAmount` as the current CV/DV payment after deductions.
- Exclude the current CV/DV when editing.
- Reject saves that exceed the current remaining APV amount.

This prevents double-vouchering even if two users open the same APV, stale browser data is submitted, or someone bypasses the frontend.

## 14. Best Recommendation

Build Copy From as a workflow contract, not as one generic frontend feature.

Use the shared frontend dropdown/modal for a consistent user experience, but make each backend source-to-target pair responsible for exact eligibility and remaining-balance rules.

For amount-based workflows, implement amount-balance allocation. A `<SourceModule>` for 5000 copied into a `<TargetModule>` for 3000 must remain available with 2000 remaining, and the backend must reject any later target transaction that tries to consume more than 2000.

For quantity-based workflows, implement line-quantity availability if partial copying is allowed. If the business rule is one `<SourceModule>` can become only one `<TargetModule>`, then declare it as header once and exclude it after use.
