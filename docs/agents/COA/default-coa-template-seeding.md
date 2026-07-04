# Default Chart of Accounts Template Seeding

## Purpose

Every newly added company must receive a copy of the standard Chart of Accounts (COA). The source should no longer be hardcoded frontend seed data. It should live in master/platform tables so admin-side changes affect only companies created after the change.

Existing companies must keep their own COA unless a separate migration/import action is explicitly run.

## Source Workbook

Reference file:

```text
C:\Users\Bay\Downloads\Gr8Books-Neo-Standard-COA.xlsx
```

Workbook shape inspected on 2026-07-01:

| Column | Meaning |
|---|---|
| Code | COA business account code |
| AccountType | Financial statement group, for example Balance Sheet or Income Statement |
| Type | Accounting type, for example ASSETS, Liabilities, Equity, REVENUES, EXPENSES |
| Description | Account title |
| Major Acct Type | Hierarchy label |
| Nature | Normal balance, Debit or Credit |

Workbook count:

| Level label | Target `ChartAccountLevel` | Count |
|---|---:|---:|
| Major Acct Type | `MAJOR` | 6 |
| Sub Acct 1 | `SUB1` | 10 |
| Sub Acct 2 | `SUB2` | 6 |
| Sub Acct 3 | `SUB3` | 22 |
| Specific Acct | `SPECIFIC` | 133 |

Total rows: 177.

## Required Behavior

1. Seed the master default COA template from the workbook.
2. When a company is created, copy the current active default COA template into `chart_accounts`.
3. Preserve hierarchy by resolving parent rows from the copied template, not by using account code as a foreign key.
4. After copy, company users may add, edit, disable, and reorder only `SPECIFIC` accounts.
5. Company users must not add, edit, disable, or reorder `MAJOR`, `SUB1`, `SUB2`, or `SUB3` accounts from the company COA screen.
6. Master-side edits to the default template affect only future companies.

## Recommended Tables

### `default_chart_accounts`

Stores the current platform-owned default COA template.

| Field | Notes |
|---|---|
| `id` | Primary key |
| `parent_default_account_id` | Self-reference for template hierarchy |
| `account_code` | Business code from workbook |
| `account_title` | Workbook `Description` |
| `account_level` | `MAJOR`, `SUB1`, `SUB2`, `SUB3`, `SPECIFIC` |
| `account_type` | `ASSET`, `LIABILITY`, `EQUITY`, `REVENUE`, `EXPENSE` |
| `account_nature` | `DEBIT` or `CREDIT` |
| `account_group` | Workbook hierarchy label or local group label |
| `report_alias` | Workbook `AccountType`, for example Balance Sheet |
| `is_posting_account` | Usually true for `SPECIFIC`, false for higher levels |
| `order_no` | Display/reorder value inside siblings |
| `status` | `ACTIVE` or `INACTIVE` |
| `created_at`, `updated_at` | Audit timestamps |

Recommended unique constraints:

```text
UNIQUE(account_code)
```

### `default_accounts`

Stores module/purpose mappings to default COA template rows. This keeps the COA template as a chart hierarchy and avoids hardcoding account names in modules.

| Field | Notes |
|---|---|
| `id` | Primary key |
| `module_code` | Module code, for example `BM` for Bank Masterfile |
| `account_role` | Purpose key, for example `CASH_IN_BANK_PARENT` |
| `default_chart_account_id` | FK to `default_chart_accounts.id` |
| `required_level` | Expected level, for example `SUB3` or `SPECIFIC` |
| `usage_type` | `PARENT`, `POSTING`, or `SELECTION_GROUP` |
| `description` | Human-readable purpose |
| `status` | `ACTIVE` or `INACTIVE` |
| `created_at`, `updated_at` | Audit timestamps |

Recommended unique constraint:

```text
UNIQUE(module_code, account_role)
```

Example default account mappings:

| Module | `account_role` | Points to template row | Usage |
|---|---|---|---|
| `BM` Bank Masterfile | `CASH_ON_HAND_PARENT` | Cash on Hand | Cash account parent/group reference |
| `BM` Bank Masterfile | `CASH_IN_BANK_PARENT` | Cash in Banks | Parent for generated bank COA accounts |
| `CD` Cash Disbursement | `PETTY_CASH_FUND` | Petty Cash Fund | Posting account or selection default |
| `CD` Cash Disbursement | `ACCOUNTS_PAYABLE_PARENT` | Accounts Payables | Debit account group for supplier payments |

### Optional: `default_chart_account_versions`

Use this only if master-side edits need version history.

| Field | Notes |
|---|---|
| `id` | Primary key |
| `version_name` | Example: 2026 Standard COA |
| `status` | Draft, Active, Archived |
| `activated_at` | Timestamp used by company creation flow |

## Module Anchor Keys

Use `default_accounts` for module anchors. Do not put module-specific meaning directly on `default_chart_accounts`; the same COA row may serve multiple modules or transaction purposes.

Recommended initial anchors:

| `account_role` | Required row | Level | Purpose |
|---|---|---|---|
| `CASH_ON_HAND_PARENT` | Cash on Hand | `SUB3` | Cash disbursement credit account grouping |
| `PETTY_CASH_FUND` | Petty Cash Fund | `SPECIFIC` | Petty cash disbursement credit account |
| `CASH_IN_BANK_PARENT` | Cash in Banks | `SUB3` | Bank Masterfile parent for generated bank accounts |
| `ACCOUNTS_PAYABLE_PARENT` | Accounts Payables | `SUB3` | Supplier payment debit account grouping |

The platform seed must validate that every active `default_accounts.default_chart_account_id` points to an active `default_chart_accounts` row with the expected level.

## Company Copy Flow

Run this inside the same transaction that creates the company, or immediately after company creation before modules become usable.

1. Load active `default_chart_accounts`, ordered by hierarchy level and `order_no`.
2. Create company `chart_accounts` for root rows first.
3. Keep an in-memory map of `default_chart_account.id -> chart_account.id`.
4. For each child row, set `parentAccountId` from that map.
5. Copy `SPECIFIC` rows as posting accounts unless the template row explicitly says otherwise.
6. Copy active `default_accounts` rows into company-level account role mappings, resolving `default_chart_account_id` through the in-memory map.
7. Reject company activation if required account roles, especially Bank Masterfile `CASH_IN_BANK_PARENT`, were not copied.

Recommended company-level mapping table:

```text
company_default_accounts
```

| Field | Notes |
|---|---|
| `id` | Primary key |
| `company_id` | Company owning the copied default |
| `module_code` | Module code |
| `account_role` | Purpose key |
| `chart_account_id` | FK to copied company `chart_accounts.id` |
| `usage_type` | `PARENT`, `POSTING`, or `SELECTION_GROUP` |
| `status` | `ACTIVE` or `INACTIVE` |

Recommended unique constraint:

```text
UNIQUE(company_id, module_code, account_role)
```

## User Edit Rules

Company COA UI and backend validation must enforce:

| Action | Major/Sub levels | Specific level |
|---|---:|---:|
| Add | No | Yes |
| Edit title/details | No | Yes |
| Disable | No | Yes, unless used by transactions |
| Reorder | No | Yes, within the same parent |
| Reparent | No | Usually no; allow only with accounting approval |

Master-side default COA maintenance may edit all levels because it affects only future companies.

## Bank-Specific Accounts

The workbook includes Specific accounts such as Cash in Bank - BDO, Cash in Bank - BPI, and similar rows. For production Bank Masterfile behavior, those should not be treated as required bank records.

Preferred rule:

- Seed the Cash in Banks parent/group in `default_chart_accounts`.
- Add a `default_accounts` mapping for Bank Masterfile `CASH_IN_BANK_PARENT` pointing to that Cash in Banks parent/group.
- Let Bank Masterfile create company-specific bank COA accounts under that parent when the user adds actual bank records.
- Do not rely on pre-seeded bank-name Specific accounts for check generation or bank selection.

If sample bank Specific accounts are kept in the default COA, mark them as ordinary editable company Specific accounts, not as Bank Masterfile records.

## Cash Disbursement Account Usage

Cash disbursement should select accounts from the company COA copy, not from the platform default table.

Credit account candidates:

| Purpose | COA source |
|---|---|
| Cash on Hand | Active posting Specific accounts under `CASH_ON_HAND_PARENT` |
| Cash in Bank | Active Bank Masterfile records and their linked COA accounts under `CASH_IN_BANK_PARENT` |
| Petty Cash | Active `PETTY_CASH_FUND` or active petty-cash Specific accounts |

Debit account candidates depend on payment purpose:

| Payment purpose | Debit account |
|---|---|
| Office supplies | Office Supplies Expense, or nearest active expense Specific account |
| Utility bill | Utilities Expense |
| Rent | Rent Expense |
| Employee reimbursement | Employee Receivable or Travel Expense |
| Supplier payment | Accounts Payable |
| Loan payment | Loan Payable |
| Asset purchase | Equipment or Furniture |
| Tax payment | Tax Expense or Withholding Tax Payable |

These are selection/filtering rules. They should not create default journal entries automatically until the transaction module design is finalized.

## Implementation Notes

- Add Prisma models and migration for the default COA template.
- Add Prisma models and migration for `default_accounts` and `company_default_accounts`.
- Add a seed task that imports/upserts the workbook rows into the default template table.
- Add seed data for default account mappings, starting with Bank Masterfile `CASH_IN_BANK_PARENT`.
- Add a company provisioning helper such as `seedDefaultChartAccountsForCompany(prisma, companyId)`.
- Call that helper from onboarding company creation and workspace company creation.
- Update Chart of Accounts service validation so only `SPECIFIC` rows are company-editable.
- Update Bank Masterfile lookup to prefer `company_default_accounts` for `BM:CASH_IN_BANK_PARENT` instead of fuzzy title matching once mappings exist.
