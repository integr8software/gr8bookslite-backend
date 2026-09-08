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
  id: string; // Opaque selection identity; never render as Reference No
  source: string;
  sourceNo: string;
  documentDate: string;
  partyId?: string;
  partyCode?: string;
  partyName?: string;
  currency: string;
  grossAmount?: string;
  consumedGrossAmount?: string;
  availableGrossAmount?: string;
  amount?: string;
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
  grossAmount?: string;
  amount?: string;
  consumptionAmount?: string;
  partyId?: string;
  partyCode?: string;
  partyName?: string;
  particulars?: string;
  responsibilityCenterId?: string;
  responsibilityCenter?: string;
  referenceNo?: string;
  extra?: Record<string, string | number | boolean | null>;
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
    | 'grossAmount'
    | 'consumedGrossAmount'
    | 'availableGrossAmount'
    | 'amount'
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
      transactionNo: parsePublicSourceReference(input.sourceReference),
      companyId: input.companyId,
      branchUnitId: input.branchUnitId,
      deletedAt: null,
      status: { in: ['APPROVED', 'POSTED'] },
    },
    select: {
      id: true,
      transactionNo: true,
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
      sourceId: source.id,
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
      `Source transaction ${source.transactionNo} has only ${availableAmount.toFixed(2)} available.`,
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

- `refId` stores a public stable reference such as `<source-code>:<transactionNo>`. Do not expose an internal database primary key in user-facing Data Entry or newly saved references.
- The backend resolves the public reference within company and branch scope before locking and validating the source record.
- `grossAmount` stores the gross amount consumed from the source.
- `consumptionAmount` or a workflow-defined equivalent stores the amount consumed from the workflow's `amount` balance.
- `vatAmount`, `ewtAmount`, and `netAmount` remain accounting and tax presentation values.
- Target header `referenceModule` identifies the copied source module.

Availability must be calculated from active target detail rows:

```typescript
availableGrossAmount = source.grossAmount - sum(activeTargetDetails.grossAmount where refId = source.publicReference)
availableAmount = source.amount - sum(activeTargetDetails.consumptionAmount where refId = source.publicReference)
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

- Declare the balance basis explicitly when gross and the workflow-defined amount differ.
- Display `availableGrossAmount` when the Copy From Amount column represents gross value.
- Use `availableAmount` for the remaining workflow-defined amount.
- Allow the user to reduce the copied amount when partial consumption is allowed, and scale all related amount fields from one declared ratio.
- Never allow either consumption amount to exceed its corresponding available balance.
- If source detail lines include tax data, copy the source detail line fields first, then scale the amounts proportionally when the source is only partially available.
- Save the public source reference on every copied target detail row. Resolve it to the source record on the backend within tenant and branch scope.
- Disable a source already present in the current target and reject a stale Apply attempt for that same source.

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
- User-facing and persisted references use public transaction references rather than internal database IDs.
- The frontend disables sources already added to the current target and guards Apply against stale duplicate selections.
- The backend groups all submitted rows and legacy/public aliases by resolved source before validating total consumption.
- Frontend filtering mirrors backend rules but is not treated as authority.
- Tests cover race/stale-data behavior by attempting to save more than the remaining amount or quantity.

## 13. Dual Amount Workflow

Use this structure when `<source-module>` and `<target-module>` track both a gross amount and a second workflow-defined amount. The second amount may represent an expense, disbursement, settlement, net value, or another module-specific basis.

| Property | Rule |
| --- | --- |
| Source | `<source-module>` |
| Target | `<target-module>` |
| Selection mode | Declared by the workflow as `single` or `multiple`. |
| Consumption type | Header dual amount balance. |
| Party restriction | Declared by the workflow. If enabled, selected sources must share the target party. |
| Currency restriction | Declared by the workflow. |
| Branch restriction | Same active branch unless the workflow explicitly allows otherwise. |
| Allocation storage | A separate table is optional when target details already store public `refId`, `grossAmount`, and the workflow consumption amount. |

### Amount Semantics

Do not give the generic contract a field tied to one business process. Declare what `amount` means in each `<source-module> + <target-module>` workflow.

```typescript
type <SourceCopyCandidate> = {
  id: string; // Opaque selection identity; never display in Data Entry
  transactionNo: string;
  partyId?: string;
  partyCode?: string;
  partyName?: string;
  currency?: string;
  exchangeRate?: number;

  grossAmount: number;
  consumedGrossAmount: number;
  availableGrossAmount: number;

  amount: number; // Workflow-defined amount
  consumedAmount: number;
  availableAmount: number;

  details: <SourceDetail>[];
};
```

The workflow definition must name the business meaning of `amount` and the target detail field used to persist its consumption:

```typescript
type <DualAmountDefinition> = {
  amountMeaning: '<expense | disbursement | settlement | net | other>';
  sourceGrossField: '<source-gross-field>';
  sourceAmountField: '<source-amount-field>';
  targetGrossField: 'grossAmount';
  targetAmountField: '<target-consumption-field>';
};
```

The candidate endpoint returns only sources whose required available balance is greater than zero. A workflow that consumes both balances requires both `availableGrossAmount > 0` and `availableAmount > 0`.

### Apply Mapping

When `<source-module>` is copied into `<target-module>`:

- Set target `referenceModule` to the configured `<source-module>` identifier.
- Format the public reference as `<source-code>:<transactionNo>`.
- Store the public reference in the target header reference and every copied target detail `refId`.
- Never display or persist the candidate `id` as Data Entry Reference No.
- Preserve target header values when already populated; otherwise copy configured party, currency, project, and remark fields.
- Copy configured source detail fields into target detail fields.
- Use `availableGrossAmount` in the Copy From Amount column when that column represents gross value.
- Disable a source already represented by an editable target detail and label it `Already added`.
- Reject a stale Apply attempt that includes a source already added to the current target.

Example:

```typescript
target.referenceModule = '<source-module>';
target.referenceNo = `<source-code>:${source.transactionNo}`;

targetDetail.refId = `<source-code>:${source.transactionNo}`;
targetDetail.grossAmount = sourceDetail.<source-gross-field>;
targetDetail.<target-consumption-field> = sourceDetail.<source-amount-field>;
```

If gross amount is 5000 and the workflow-defined amount is 4850, copying 3000 gross proportionally consumes 2910 of the workflow-defined amount. The next candidate response returns `availableGrossAmount = 2000` and `availableAmount = 1940`.

When proportional copying is used, calculate one ratio from gross availability and apply it consistently to gross, workflow amount, tax, net, and other related amount fields. A dedicated allocation UI may replace proportional scaling when users must choose exact line amounts.

At submission, derive `<target-module>.amount` from the target detail field declared by `targetAmountField`. Exclude generated accounting counterpart rows. Validate the submitted target amount against the same detail total, then validate both remaining source balances inside the save transaction.

### Save-Time Guard

Create and update for `<target-module>` must validate copied `<source-module>` rows inside the database transaction:

- Resolve `<source-code>:<transactionNo>` within current company and branch scope.
- Lock each resolved source before checking remaining balances.
- Re-read source status, scope, party, currency, gross amount, and workflow-defined amount.
- Sum existing active target details by public `refId` and include configured legacy references when required.
- Use `grossAmount` for gross consumption and `targetAmountField` for workflow amount consumption.
- Aggregate all submitted rows and legacy/public aliases by resolved source before comparing totals.
- Exclude the current target when editing.
- Reject saves that exceed either `availableGrossAmount` or `availableAmount`.

This prevents duplicate consumption when users have stale browser data, save concurrently, or bypass the frontend.

## 14. Best Recommendation

Build Copy From as a workflow contract, not as one generic frontend feature.

Use the shared frontend dropdown/modal for a consistent user experience, but make each backend source-to-target pair responsible for exact eligibility and remaining-balance rules.

For amount-based workflows, implement amount-balance allocation. A `<SourceModule>` for 5000 copied into a `<TargetModule>` for 3000 must remain available with 2000 remaining, and the backend must reject any later target transaction that tries to consume more than 2000.

For quantity-based workflows, implement line-quantity availability if partial copying is allowed. If the business rule is one `<SourceModule>` can become only one `<TargetModule>`, then declare it as header once and exclude it after use.
