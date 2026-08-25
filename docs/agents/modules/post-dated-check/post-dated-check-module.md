# Post Dated Check Frontend Module

## Scope and source of truth

Implement module code `PDCW` at `/cash-receipt/post-dated-check` as a frontend transaction module. This specification must be read with:

- `gr8bookslite-frontend/AGENTS.md`
- `gr8bookslite-frontend/FRONTEND_TRANSACTION_MAP.md`
- `gr8bookslite-frontend/QA_ANALYSIS_GUIDE.md`

The transaction map controls folder ownership and page composition. The QA guide controls correctness, state ownership, loading/error handling, formatting, and verification. Do not add `Main.tsx`, `Action.tsx`, or generic `index.ts` barrels.

The Post Dated Check backend has been removed. Until an API is restored, the service uses sample data from the module data layer and persists changes in browser storage. UI components must never access browser storage directly.

## Required route structure

Routes are thin adapters and import concrete pages directly:

```text
app/(modules)/cash-receipt/post-dated-check/
  page.tsx                         -> PostDatedCheckOverviewPage
  add/page.tsx                     -> PostDatedCheckActionPage
  edit/[recordId]/page.tsx         -> PostDatedCheckActionPage
  view/[recordId]/page.tsx         -> PostDatedCheckActionPage
```

Resolve the base route with `getModuleRoute("PDCW")`. Do not hard-code the route or read `MODULE_ROUTE_MAP.PDCW` directly.

## Required frontend structure

```text
app/src/ui/modules/cash-receipt/post-dated-check/
  action/
    PostDatedCheckActionPage.tsx
    PostDatedCheckActionHeader.tsx
    PostDatedCheckDetailsFields.tsx
  entries/
    PostDatedCheckEntrySection.tsx
    PostDatedCheckLineColumns.tsx
  overview/
    PostDatedCheckOverviewPage.tsx

app/src/hooks/modules/cash-receipt/post-dated-check/
  usePostDatedCheckActionPage.ts
  usePostDatedCheckOverviewPage.ts
  PostDatedCheckQueryKeys.ts

app/src/services/modules/cash-receipt/post-dated-check/
  PostDatedCheckService.ts

app/src/data/modules/cash-receipt/post-dated-check/
app/src/types/modules/cash-receipt/post-dated-check/
app/src/constants/modules/cash-receipt/post-dated-check/
app/src/validations/modules/cash-receipt/post-dated-check/
```

Add narrowly named `NotFound`, history, field-control, entry-cell, tabs, or record-action files only when those responsibilities exist. Never create wrapper-only files.

## Ownership rules

- Action and overview hooks own local state, React Query orchestration, mutations, navigation decisions, and event handlers.
- Services own sample-record retrieval and persistence and preserve an API-compatible async boundary.
- Data files own sample records, defaults, and pure mappings.
- Validation files own Zod schemas and field-level business rules.
- Constants own route identity and stable options.
- UI files render props/hook results and compose shared components; they do not fetch, mutate, or access storage.
- Query keys include the active company and branch plus relevant filters. Persisted sample-data keys must also be tenant scoped.

## Overview page

Compose the overview from `ModuleHeader`, `ModuleStatisticCards`, filters, toolbar actions, and the shared `ModuleTable`. The hook owns filtered records and table state. Provide explicit loading, error, empty, and mutation-pending states.

Columns, in order:

1. PDC Registry No.
2. PDC Registry Date
3. Party Code
4. Party Name
5. Type
6. Total Amount
7. Status
8. Actions

Search registry number, party code, party name, remarks, PDC bank, and PDC number. Keep the existing sidebar link immediately below Bank Reconciliation.

## Action page composition

`PostDatedCheckActionPage` is the composer only. It calls `usePostDatedCheckActionPage` and renders, in order:

1. `PostDatedCheckActionHeader`
2. `PostDatedCheckDetailsFields`
3. `PostDatedCheckEntrySection`
4. Save/status controls when permitted

The action header contains Back to Registry, Copy From, and Save Registry beside one another. Copy From provides Sales Invoice, Billing Invoice, and Service Invoice. Save is disabled while a save is pending, and both Copy From and Save are hidden in read-only view mode. These actions are not rendered inside the details grid.

Show a loading state while an existing record is loading and a dedicated not-found/error state when it cannot be loaded. View mode is read-only.

## Header fields

Use one responsive three-column details panel. Each label and control are on the same row; columns may stack responsively without changing field order.

| Column | Rows |
| --- | --- |
| First | Party Name; Remarks |
| Second | Party Code; Type |
| Third | PDC No.; PDC Date |

Rules:

- Party Name and Party Code represent the same selected sample party and remain synchronized.
- Type is required and uses an `AppAdvancedDropdown` with `Lodgment` and `Release`.
- Remarks uses `AppLimitedTextarea` and is limited to 500 characters.
- Registry number and date are required.
- Labels use `htmlFor` and controls use matching `id` values.

## Entry section

Use `ModuleDataEntry`. Define the column factory in `PostDatedCheckLineColumns.tsx`; keep the section responsible for composition and totals.

| Order | Column | Rule |
| --- | --- | --- |
| 1 | No. | Generated one-based line number, read-only |
| 2 | Check Date | Required date |
| 3 | Bank | Required text |
| 4 | Check Number | Required trimmed value, unique within the registry regardless of bank |
| 5 | Amount | Required number greater than zero |
| 6 | Reference No. | Optional supporting-document reference |

Support shared row add, insert, remove, duplicate, move, and read-only behavior. Display the total amount in the summary row. Renumber lines before saving.

When appending a row, inherit the preceding row's Bank and increment the numeric suffix of its Check Number while preserving leading zeros. For example, Bank `BPI` and Check Number `0000001` produce Bank `BPI` and Check Number `0000002` on the new row. Leave the new row's date, amount, and reference number empty.

Determine the increment from the highest matching Check Number already present for the inherited bank and prefix, not only from the last row. Thus, rows `000001`, `000002`, and `000003` produce `000004` even if the last row is subsequently changed to duplicate `000001`.

## Validation and sample behavior

- Require party, type, registry number, registry date, and at least one complete detail row.
- Reject partially completed rows and duplicate PDC numbers.
- After the user finishes editing a Check Number, immediately alert them and mark the field invalid when it duplicates another row.
- Normalize surrounding whitespace before persistence.
- Seed several realistic records spanning both types and multiple statuses.
- Sample create, update, status changes, list, and detail lookup remain asynchronous so a future API can replace the service without UI changes.
- Treat storage/parsing failures as service errors and surface them through the hooks.

## QA acceptance checklist

- No `Main.tsx`, `Action.tsx`, generic `index.ts`, old `FormPage`, old `ListPage`, old `DataEntryTable`, or old `Api.ts` file remains in this feature.
- Routes import overview/action pages directly.
- Labels and controls share a row and have valid accessibility associations.
- Copy From is beside Back to Registry and offers exactly the three specified sources.
- Header grouping and six entry columns match this specification exactly.
- Components do not own query/mutation/storage logic.
- Loading, not-found/error, empty, disabled, and read-only states are visible and testable.
- Company/branch changes cannot reuse stale query or persisted sample data.
- Changed files pass Prettier, targeted ESLint, TypeScript checking, and the production build when the wider repository is healthy.
