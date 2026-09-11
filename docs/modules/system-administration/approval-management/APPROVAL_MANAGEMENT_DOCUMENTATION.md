# Approval Management Documentation

## 1. Purpose

The **Approval Management** module provides the system-administration workflow for configuring approval rules and actioning pending approval transactions.

It has two user-facing areas:

- **Approval Rules** at `/system-administration/approval-management`, where administrators choose transaction modules, bind active approver setup records, define approval paths, and save active or inactive workflow rules.
- **Approval Transactions** at `/system-administration/approval-management/approval-transactions`, where approvers review pending transaction journal headers and approve or disapprove them.

The backend is the authority for tenant context, valid transaction modules, valid approver setup membership, rule matching, pending approver checks, and status synchronization back to the source transaction.

---

## 2. Architecture and File Layout

| Layer                    | Path                                                                                                                                                                 | Responsibility                                                                                                                                        |
| :----------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend module           | `src/modules/system-administration/approval-management/approval-management.module.ts`                                                                                | Registers Prisma, auth/access dependencies, controller, service, and service export.                                                                  |
| Backend controller       | `src/modules/system-administration/approval-management/approval-management.controller.ts`                                                                            | Exposes the versioned REST API under `/api/v1/system-administration/approval-management`.                                                             |
| Backend service          | `src/modules/system-administration/approval-management/approval-management.service.ts`                                                                               | Resolves company context, validates workflow payloads, matches rules to pending journal headers, stores approval progress, and syncs source statuses. |
| Backend DTOs             | `src/modules/system-administration/approval-management/dto/`                                                                                                         | Defines Swagger and validation contracts for workflow upsert, action remarks, and response payloads.                                                  |
| Backend mapper           | `src/modules/system-administration/approval-management/mappers/approval-workflow.mapper.ts`                                                                          | Converts persisted approval rules and approver setup records into frontend workflow records.                                                          |
| Backend tests            | `src/modules/system-administration/approval-management/approval-management.service.spec.ts`                                                                          | Covers rule matching and approval progress creation for pending journal headers.                                                                      |
| Frontend routes          | `gr8bookslite-frontend/app/(modules)/system-administration/approval-management/`                                                                                     | Next.js route entries for Approval Rules and Approval Transactions.                                                                                   |
| Frontend UI              | `gr8bookslite-frontend/app/src/ui/modules/approval-management/`                                                                                                      | Screens, side panels, editor, approver setup cards, transaction table, preview, and action dialogs.                                                   |
| Frontend hooks           | `gr8bookslite-frontend/app/src/hooks/modules/approval-management/`                                                                                                   | React Query orchestration for workflows, transaction list filters, mutations, and alert-tab state.                                                    |
| Frontend service         | `gr8bookslite-frontend/app/src/services/modules/approval-management/ApprovalManagementApi.ts`                                                                        | Calls the backend API and maps generated API records into frontend module types.                                                                      |
| Frontend validation/data | `gr8bookslite-frontend/app/src/validations/modules/system-administration/approval-management/` and `gr8bookslite-frontend/app/src/data/modules/approval-management/` | Owns client-side form constraints, default records, routing rule synchronization, table rows, and display formatting.                                 |

---

## 3. Backend API

**Base URL**: `/api/v1/system-administration/approval-management`  
**Authentication**: Bearer JWT through `JwtAuthGuard`  
**Swagger tag**: `Approval Management`

| Method  | Endpoint                                  | Purpose                                                                     | Rate limit |
| :------ | :---------------------------------------- | :-------------------------------------------------------------------------- | :--------- |
| `GET`   | `/modules`                                | Returns active transaction modules available for approval workflow setup.   | 120/min    |
| `GET`   | `/workflows`                              | Returns saved approval workflows for the active company.                    | 120/min    |
| `PUT`   | `/workflows/:moduleCode`                  | Replaces the approval rules for one module scope with the posted workflow.  | 30/min     |
| `PATCH` | `/workflows/:workflowId/inactivate`       | Sets every approval rule for the workflow module scope to `Inactive`.       | 30/min     |
| `GET`   | `/transactions`                           | Returns pending approval transactions derived from journal-entry headers.   | 120/min    |
| `POST`  | `/transactions/:transactionId/approve`    | Approves the pending transaction for the current user when they may act.    | 30/min     |
| `POST`  | `/transactions/:transactionId/disapprove` | Disapproves the pending transaction for the current user when they may act. | 30/min     |

All workflow and transaction endpoints require an active `AuthUser.companyId`. Without it, the service rejects the request with `An active company context is required.`

---

## 4. Persistence Model

Approval Management uses the following Prisma models:

| Model                         | Table                            | Role                                                                                                                                                            |
| :---------------------------- | :------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ApproverSetup`               | `approver_setups`                | Defines active approver setup records by company, module scope, type, level name, condition, and status. Approval rules point to these setup records.           |
| `ApproverSetupUser`           | `approver_setup_users`           | Stores users inside each approver setup and their sequence. Approval workflow saves may update this sequence to match the configured route order.               |
| `ApprovalRule`                | `approval_rules`                 | Stores one route/condition for a module workflow. Multiple rows with the same `companyId` and `moduleScope` represent one workflow with multiple routing rules. |
| `ApprovalTransaction`         | `approval_transactions`          | Stores durable approval progress for a real pending source transaction. It is unique by `companyId`, `moduleScope`, and synthetic `referenceNo`.                |
| `ApprovalTransactionApprover` | `approval_transaction_approvers` | Stores each approver's sequence, status, timestamp, and optional remarks for an approval progress row.                                                          |
| `JournalEntryHeader`          | `journal_entry_header`           | Source of pending Approval Transactions. The list reads pending headers with `status = "For Approval"` and supported `referenceType` values.                    |

Important source-reference behavior:

- The Approval Transactions page is backed by `JournalEntryHeader`, not by seeded or placeholder approval progress alone.
- `ApprovalTransaction.referenceNo` is an internal state key in the format `<referenceType>-<referenceId>`.
- The user-facing transaction reference falls back through source transaction numbers, `JournalEntryHeader.referenceNo`, and then `JE-<jeno>`.
- `JournalEntryHeader.referenceType` is treated as the approval module scope.

---

## 5. Workflow Rules

### Transaction Module Discovery

`GET /modules` returns active `Module` records whose `type` JSON array contains `transaction` or `Transaction`. The frontend uses this to render one editable workflow row per active transaction module. If a module has no saved rules yet, the frontend creates an unsaved default record locally until the user saves it.

### Workflow Upsert

`PUT /workflows/:moduleCode` replaces all existing approval rules for the current company and module scope:

1. The body `moduleCode` must match the URL `:moduleCode`.
2. The module code must exist as an active transaction module.
3. Every selected approver user must belong to the current company.
4. Any posted `sourceApproverSetupId` must exist for the same company and module scope.
5. Each routing rule's `stageSequences` must resolve to posted stages.
6. Each approval rule must use approvers from one approver setup.
7. Existing `ApprovalRule` rows for the company/module scope are deleted.
8. New `ApprovalRule` rows are created for the posted routing rules.

If no routing rules are supplied inside the service flow, the backend creates an `Otherwise` default route using all stages in sequence. The DTO currently requires at least one routing rule, so normal frontend saves always post at least one.

### Frontend Workflow Payload

The frontend posts this shape after converting string approver IDs and stage IDs into backend-friendly values:

```json
{
  "moduleCode": "APV",
  "moduleName": "Accounts Payable Voucher",
  "status": "Active",
  "description": "Finance approval path.",
  "stages": [
    {
      "sourceApproverSetupId": "39580d5f-27ae-47d0-a211-32da76557de6",
      "sequence": 1,
      "name": "Management Review",
      "requirement": "all",
      "approverIds": [22]
    }
  ],
  "routingRules": [
    {
      "sequence": 1,
      "name": "Otherwise",
      "basis": "default",
      "amountOperator": "greaterThan",
      "amountValue": "",
      "stageSequences": [1]
    }
  ]
}
```

Frontend stage records use IDs like `approval-stage-<approverSetupId>-<userId>`. Before saving, `ApprovalManagementApi.ts` extracts `sourceApproverSetupId`, converts approver IDs to numbers, and converts routing rule `stageIds` into stage sequence numbers.

### Rule Types and Ordering

Approval rules use `ruleType` values:

- `default`: used as the Otherwise route when no amount condition matches.
- `amount`: used for amount-threshold routes.

Amount rules support:

- `greaterThan`
- `greaterThanOrEqual`
- `lessThan`
- `lessThanOrEqual`

When evaluating a transaction, the service first sorts amount rules by route/condition number parsed from names like `Condition 1` or `Route 2`. It selects the first amount rule whose amount comparison matches. If none match, it uses the first default rule. If no rule or approval path exists, the transaction is not returned in the approval list.

The current backend treats `ruleType === "amount"` as sequential approval. Default routes are treated as non-sequential for action permissions.

---

## 6. Approval Transactions

### Pending List Flow

`GET /transactions` performs this flow:

1. Load current-company journal headers where:
   - `referenceType` is one of the supported approval source scopes.
   - `status` is `For Approval`.
2. Load active approval rules for the header module scopes.
3. If a module has no active `ApprovalRule`, create a default active rule from the earliest active `ApproverSetup` for the scope when one exists.
4. Resolve APV source amounts separately from `AccountsPayableVoucher.amount`; other modules use `JournalEntryHeader.totalDebit`.
5. Resolve source transaction numbers for APV and JV display references when available.
6. Build an approval context by matching the active rule and approval path.
7. Create or refresh durable `ApprovalTransaction` and `ApprovalTransactionApprover` progress rows.
8. Return mapped approval transaction records for rows with valid contexts.

`ApprovalTransaction` progress is reset when the selected rule changes, when the saved progress is terminal, or when the approver path no longer matches the active rule path.

### Transaction Response Shape

The frontend expects each transaction to match `ApprovalTransactionResponseDto`:

```json
{
  "id": "900",
  "moduleScope": "JV",
  "moduleName": "Journal Voucher",
  "referenceNo": "JV-0005",
  "referenceId": "5",
  "remarks": "Monthly service billing",
  "ruleId": "rule-condition-2",
  "ruleName": "Condition 2",
  "amount": "1500",
  "status": "For Approval",
  "requestedAt": "2026-09-04T08:00:00.000Z",
  "canUpdateStatus": true,
  "isSequential": true,
  "blockerName": null,
  "currentApproverId": 22,
  "approvers": [
    {
      "userId": 22,
      "name": "Mara Santos",
      "sequence": 1,
      "status": "Pending",
      "approvedAt": null,
      "remarks": null
    }
  ]
}
```

Current implementation detail: the response `id` is the `JournalEntryHeader.id` string. The action endpoints parse it as a BigInt journal header id.

### Approve and Disapprove Flow

Action endpoints:

- `POST /transactions/:transactionId/approve`
- `POST /transactions/:transactionId/disapprove`

Payload:

```json
{
  "remarks": "Reviewed and approved."
}
```

`remarks` is optional, trimmed, normalized to `null` when blank, and limited to 500 characters.

For both actions, the service:

1. Parses `transactionId` as a journal header id.
2. Loads the current-company `JournalEntryHeader`.
3. Rejects records that are no longer `For Approval`.
4. Rejects unsupported `referenceType` values.
5. Rebuilds the approval context from the active workflow.
6. Rejects users who are not pending approvers.
7. For sequential rules, rejects users when an earlier approver is still pending.
8. Updates the user's `ApprovalTransactionApprover` row in a Prisma transaction.

Approve-specific behavior:

- Marks the current approver `Approved`.
- Keeps the approval transaction `For Approval` until all approvers are approved.
- When the final approver acts, marks progress `Approved`, syncs the source transaction to its posted/approved terminal status, and sets the journal header status to `Posted`.

Disapprove-specific behavior:

- Marks the current approver `Disapproved`.
- Marks progress `Disapproved`.
- Syncs the source transaction to its disapproved status.
- Sets the journal header status to `Disapproved`.

---

## 7. Supported Source Transactions

The current service supports these `JournalEntryHeader.referenceType` values:

| Reference type | Source module            | Approved transition                                                    | Disapproved transition                                                                                    |
| :------------- | :----------------------- | :--------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------- |
| `APV`          | Accounts Payable Voucher | `AccountsPayableVoucherStatus.POSTED` with `closedAt`/`closedByUserId` | `AccountsPayableVoucherStatus.DISAPPROVED` with approval/closed fields cleared and disapproval fields set |
| `CV`           | Cash Voucher             | `CashVoucherStatus.POSTED`                                             | `CashVoucherStatus.DISAPPROVED`                                                                           |
| `DV`           | Disbursement Voucher     | `DisbursementVoucherStatus.POSTED`                                     | `DisbursementVoucherStatus.DISAPPROVED`                                                                   |
| `JV`           | Journal Voucher          | `JournalVoucherStatus.POSTED`                                          | `JournalVoucherStatus.DISAPPROVED`                                                                        |
| `SI`           | Service Invoice          | `ServiceInvoiceStatus.POSTED`                                          | `ServiceInvoiceStatus.DISAPPROVED`                                                                        |
| `OR`           | Official Receipt         | `OfficialReceiptStatus.POSTED`                                         | `OfficialReceiptStatus.DISAPPROVED`                                                                       |
| `CR`           | Collection Receipt       | `CollectionReceiptStatus.POSTED`                                       | `CollectionReceiptStatus.DISAPPROVED`                                                                     |
| `AR`           | Acknowledgement Receipt  | `AcknowledgementReceiptStatus.POSTED`                                  | `AcknowledgementReceiptStatus.DISAPPROVED`                                                                |
| `PVR`          | Provisional Receipt      | `ProvisionalReceiptStatus.POSTED`                                      | `ProvisionalReceiptStatus.DISAPPROVED`                                                                    |
| `BI`           | Billing Invoice          | `BillingInvoiceStatus.POSTED`                                          | `BillingInvoiceStatus.DISAPPROVED`                                                                        |
| `BILL`         | Billing                  | `BillingStatus.POSTED`                                                 | `BillingStatus.DISAPPROVED`                                                                               |
| `BS`           | Billing Statement        | `BillingStatementStatus.POSTED`                                        | `BillingStatementStatus.DISAPPROVED`                                                                      |

Every source update is scoped by `companyId` and `referenceId`. If no source row is updated, the service throws `Source transaction not found.`

Cash Voucher and Disbursement Voucher have an approval-aware save rule: when the frontend submits `FOR_APPROVAL`, the backend keeps the record `FOR_APPROVAL` only if the module has an active approval workflow with an active approver setup and at least one approver. If no such workflow exists, the backend saves the record as `POSTED` and writes the journal entry header status as `Posted`.

---

## 8. Frontend Behavior Contract

### Approval Rules Page

The Approval Rules page:

- Fetches modules from `GET /modules`.
- Fetches saved workflows from `GET /workflows`.
- Fetches approver setup records from the user-management approver setup API.
- Filters visible approver setup records by selected approver type, active status, and matching module scope/module name.
- Creates local unsaved workflow records for active transaction modules with no persisted rules.
- Syncs stages directly from selected active approver setup users.
- Uses up to five approval stages and up to five amount conditions.
- Saves through `PUT /workflows/:moduleCode`.
- Inactivates through `PATCH /workflows/:workflowId/inactivate`.

Frontend validation currently enforces:

- Module is selected.
- Stage count is 1 through 5.
- Stage count matches actual stages.
- Each stage has a level name and at least one approver.
- Routing rules exist and reference existing stages.
- Amount conditions have positive amounts.
- Amount-condition thresholds descend by configured rule order.
- Active duplicate workflows for the same module are blocked on the client.
- Description is at most 180 characters.

### Approval Transactions Page

The Approval Transactions page:

- Fetches transactions from `GET /transactions`.
- Fetches module names from `GET /modules`.
- Filters rows by module, rule, approver, and free-text query.
- Displays amount in `en-PH` PHP currency format.
- Displays status as `Done`, `Waiting for <approver>`, or `Waiting for anyone`.
- Enables Approve/Disapprove actions only when `canUpdateStatus` is true and the row is not done.
- Sends action remarks through the generated approval-management mutation functions.
- Updates the cached transaction row returned by the action endpoint.

Backend changes must preserve this response contract unless the generated API, frontend wrapper, types, hooks, and UI are updated in the same change.

---

## 9. Development Guidelines

- Keep source-of-truth validation in the backend. Frontend workflow validation is only a UX aid.
- Do not show or action approvals outside the active company context.
- Do not build Approval Transactions from placeholder approval progress rows. The list source is real pending `JournalEntryHeader` rows.
- When adding a new supported source module, update:
  - `SupportedApprovalSourceScopes`
  - source amount/reference resolver when generic `totalDebit` is insufficient
  - approved and disapproved source status mapping
  - source update delegate in `updateSourceTransaction`
  - tests for list mapping and terminal status synchronization
- If changing DTOs, regenerate backend OpenAPI before regenerating the frontend Orval client.
- If changing only documentation, no frontend lint/build is required.

---

## 10. Verification Checklist

For backend changes, cover the relevant items:

- `GET /modules` returns only active transaction modules.
- `PUT /workflows/:moduleCode` rejects mismatched module codes.
- Workflow saves reject approvers outside the active company.
- Workflow saves reject stale or cross-module `sourceApproverSetupId` values.
- `GET /workflows` groups multiple `ApprovalRule` rows into one workflow per module scope.
- `GET /transactions` returns only current-company `JournalEntryHeader.status = "For Approval"` rows with supported source scopes.
- APV approval amounts use `AccountsPayableVoucher.amount`.
- Non-APV approval amounts use `JournalEntryHeader.totalDebit`.
- Amount-condition rule matching uses the expected route order.
- Sequential approval blocks later approvers.
- Non-pending and non-approver users cannot approve or disapprove.
- Final approval updates approval progress, source transaction status, and journal header status together.
- Disapproval updates approval progress, source transaction status, and journal header status together.
- Completed transactions no longer appear in the pending list.
