# Beginning Balance Uploader Module Specification

## Purpose

Create a **Beginning Balance Uploader** transaction module for entering and maintaining balanced opening-accounting entries for a company.

The module must follow the frontend modular-monolith conventions in `gr8bookslite-frontend/AGENTS.md`, the route and shared-component guidance in `gr8bookslite-frontend/FRONTEND_MAP.md`, and the backend module/sidebar architecture in `docs/agents/modules/`.

The stable cross-layer module code is:

```text
BBU
```

User-facing label:

```text
Beginning Balance Uploader
```

## Scope

The first version provides:

- a list page for created beginning-balance upload documents;
- add, edit, and view action pages;
- a compact header with Remarks, Transaction Number, and Document Date;
- a reusable accounting Data Entry grid based on the Disbursement Voucher data-entry implementation;
- module registration, frontend route mapping, and an `Others` sidebar link.

It does not introduce a file-import format unless that is separately approved. "Uploader" in this scope means entering and saving a beginning-balance document through the Data Entry grid.

## Header and Action Page Layout

### Routes

Create thin route files under:

```text
gr8bookslite-frontend/app/(modules)/others/beginning-balance-uploader/
  page.tsx
  add/page.tsx
  edit/[recordId]/page.tsx
  view/[recordId]/page.tsx
```

Each route should only supply metadata and render the matching UI page from `app/src/ui/...`.

### Action pages

| Route | Page title | Behaviour |
|---|---|---|
| `/others/beginning-balance-uploader` | Beginning Balance Uploader | Search, filter, and open existing documents. |
| `/others/beginning-balance-uploader/add` | Add Beginning Balance | Create a document and its accounting entries. |
| `/others/beginning-balance-uploader/edit/[recordId]` | Edit Beginning Balance | Update an editable document and its entries. |
| `/others/beginning-balance-uploader/view/[recordId]` | View Beginning Balance | Display the document and entries as read-only. |

Use one feature action-page component that determines `add`, `edit`, or `view` mode from the route, following the Disbursement Voucher pattern. Do not create an `/add/new` route.

### Header fields

The action-page form header contains only these business fields:

| Field | Required | Behaviour |
|---|---:|---|
| Remarks | No | Optional free-text explanation of the opening balance being recorded. |
| Transaction Number | Yes | Displayed as a read-only identifier. The backend generates it using the transaction-number setup for `BBU`; the frontend must not generate final numbers. |
| Document Date | Yes | Date the beginning-balance document is effective. |

Layout assumption: render **Remarks** on the left, with **Transaction Number** and **Document Date** grouped beside it on the right at wider widths; stack accessibly on smaller screens. This resolves the supplied conflicting "left side" wording while retaining all three fields in the header.

## Data Entry

### Reuse requirement

Reuse the Disbursement Voucher accounting Data Entry approach rather than building a new spreadsheet control:

```text
gr8bookslite-frontend/app/src/ui/shared/module/module-data-entry/ModuleDataEntry.tsx
```

The Beginning Balance Uploader must provide its own presentational wrapper, for example:

```text
app/src/ui/modules/others/beginning-balance-uploader/BeginningBalanceUploaderDataEntryTable.tsx
```

Reuse the same interaction model currently available to Disbursement Voucher users:

- add, insert, duplicate, remove, move, paste, and clear rows;
- visible-column configuration and column resizing where supported by `ModuleDataEntry`;
- inline row errors;
- debit and credit totals; and
- read-only display in view mode.

Keep component-specific row defaults and column options in the feature `data` and `constants` folders; keep state, handlers, totals, and submit orchestration in the feature hook. Do not copy the entire Disbursement Voucher action page or place stateful logic in UI components.

### Entry fields

Begin with the accounting-entry fields used by the Disbursement Voucher grid:

- Account Code and Account Name
- Party Code and Party Name (required)
- Responsibility Center
- Reference ID
- VAT Type and ATC Code, where applicable
- Particulars
- Debit
- Credit
- Tax details/rate, where applicable

The initial visible-column set should prioritize Account Code, Account Name, Particulars, Debit, and Credit. Optional Disbursement Voucher-compatible columns remain available through the shared grid's column controls. Any beginning-balance-specific columns require an approved accounting rule before being added.

### Validation

Use Zod validation under:

```text
app/src/validations/modules/others/beginning-balance-uploader/
```

Rules:

- Transaction number and document date are required; remarks are optional.
- At least one entry is required.
- Each populated entry requires a valid posting account, Party Code, Party Name, and particulars.
- Debit and credit cannot both be positive on the same entry.
- Debit and credit totals must balance before save.
- Amounts must be non-negative and use the application currency precision.
- Read-only or posted documents cannot be changed.

The backend repeats these accounting validations; frontend validation is only an early user-facing check.

## Recommended Frontend Structure

```text
app/src/ui/modules/others/beginning-balance-uploader/
  BeginningBalanceUploaderListPage.tsx
  BeginningBalanceUploaderActionPage.tsx
  BeginningBalanceUploaderActionHeader.tsx
  BeginningBalanceUploaderDataEntryTable.tsx
  BeginningBalanceUploaderTable.tsx
  BeginningBalanceUploaderRecordActions.tsx
  BeginningBalanceUploaderNotFound.tsx

app/src/hooks/modules/others/beginning-balance-uploader/
  useBeginningBalanceUploaderListPage.ts
  useBeginningBalanceUploaderActionPage.ts

app/src/data/modules/others/beginning-balance-uploader/
  BeginningBalanceUploaderData.ts

app/src/types/modules/others/beginning-balance-uploader/
  BeginningBalanceUploaderTypes.ts

app/src/constants/modules/others/beginning-balance-uploader/
  BeginningBalanceUploaderConstants.ts

app/src/services/modules/others/beginning-balance-uploader/
  BeginningBalanceUploaderApi.ts

app/src/validations/modules/others/beginning-balance-uploader/
  BeginningBalanceUploaderValidation.ts
```

Use `ModuleHeader`, `ModuleStatisticCards`, and `ModuleTable` for the list page. Keep the routes thin and use `@/` imports.

## Backend Contract

Use a dedicated company-scoped beginning-balance document and entry model, with a transaction boundary around document creation or update. The exact Prisma names may follow the local naming convention, but the model needs these concepts:

### Beginning-balance document

| Field | Notes |
|---|---|
| id | Internal identifier. |
| companyId | Tenant/company ownership. |
| transactionNo | Unique generated number for module `BBU`. |
| documentDate | Effective date. |
| remarks | User-entered explanation. |
| status | Draft/posted or the project's approved equivalent. |
| createdBy / updatedBy | Audit identity. |
| createdAt / updatedAt | Audit timestamps. |

### Beginning-balance entry

| Field | Notes |
|---|---|
| id and documentId | Internal entry and parent references. |
| chartAccountId | Company-owned posting account ID, never an account code as the durable relation. |
| particulars | Required description. |
| debit and credit | Decimal monetary amounts. |
| partyCode and partyName | Required party references for every entry. |
| optional responsibility-center, reference, and tax fields | Match the approved reusable Data Entry fields. |
| lineOrder | Maintains grid order. |

Suggested API shape:

```text
GET    /api/v1/others/beginning-balance-uploader
GET    /api/v1/others/beginning-balance-uploader/:id
POST   /api/v1/others/beginning-balance-uploader
PATCH  /api/v1/others/beginning-balance-uploader/:id
PATCH  /api/v1/others/beginning-balance-uploader/:id/status
```

The create/update service must resolve and validate each account against the active company, ensure it is a posting account, validate balanced totals, and commit the document and all entries atomically.

## Module and Sidebar Registration

### Backend catalog

Add this identity-only record to:

```text
gr8bookslite-backend/prisma/seeds/moduleCatalog.ts
```

```ts
{
  code: "BBU",
  name: "Beginning Balance Uploader",
  icon: "journal",
  type: TransactionRegistry,
}
```

Do not add a frontend URL to the backend catalog. The module code is the stable backend/frontend contract.

### Backend sidebar seed

Add this link under the existing `others` section in `AccountingSidebarTemplate` in:

```text
gr8bookslite-backend/prisma/seeds/moduleSystemCatalog.ts
```

```ts
link("others-beginning-balance-uploader", "BBU", "journal")
```

Because `AccountingAndInventorySidebarTemplate` reuses the Accounting template's `others` section, the link will also be available to the Accounting and Inventory system. Confirm the target icon exists in the sidebar icon registry before implementation; use the project's closest supported icon if `journal` is unavailable.

### Frontend routing and fallback catalog

Add matching entries to all frontend navigation sources that are still used for fallback/search/permissions:

| File | Required entry |
|---|---|
| `app/src/data/shared/modules/ModuleRouteMap.ts` | `BBU: "/others/beginning-balance-uploader"` |
| `app/src/data/shared/modules/ModuleCatalogData.ts` | Permission code for `others-beginning-balance-uploader` and the matching item under the `Others` section. |
| Breadcrumb/help data, if maintained for module navigation | Label, route, and concise module description. |

The runtime sidebar adapter derives the href from `moduleCode` with `getModuleRoute`; do not hard-code the route in sidebar React components or add it to the backend module record.

## Permissions and Status

Use the same module-action pattern as other transaction modules:

| Action | Required permission |
|---|---|
| List/view | `BBU` view |
| Add | `BBU` add/create |
| Edit | `BBU` edit |
| Post/status change, if enabled | Explicit BBU post/status permission |

At minimum, users without view permission must not see or open the module. Add and edit permissions must govern the action-page buttons and be enforced by the backend.

## Acceptance Criteria

- `BBU` is present in the backend module catalog and is included in the `Others` sidebar template.
- The frontend route map resolves `BBU` to `/others/beginning-balance-uploader`.
- The fallback/frontend catalog contains the matching `Others` navigation item and permission code.
- List, add, edit, and view routes exist and route files remain thin.
- Action pages contain Remarks, generated Transaction Number, and Document Date in the header.
- Data Entry uses `ModuleDataEntry` with the Disbursement Voucher interaction pattern; view mode is read-only.
- A document cannot be saved with no entries, invalid accounts, or unbalanced debit/credit totals.
- Backend saves a valid document and all its entries atomically and scopes every record/account lookup to the current company.
- Relevant frontend and backend lint/build/test checks pass after implementation.

## Implementation Notes

- This document intentionally specifies module registration and a working UI/API slice, not a bulk spreadsheet or CSV upload. Add import-template, parsing, preview, and rollback requirements only in a dedicated follow-up specification.
- Do not use the backend module catalog to own page URLs. The frontend `MODULE_ROUTE_MAP` owns routes.
- Do not duplicate Disbursement Voucher's large action page. Reuse `ModuleDataEntry` and adapt its feature-specific configuration, data mappers, hook, and validation for beginning balances.
