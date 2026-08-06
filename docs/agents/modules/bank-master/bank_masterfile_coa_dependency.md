# Bank Masterfile COA Dependency

## Purpose

Bank Masterfile depends on Chart of Accounts, but it should not own the whole COA default seed. It should read the needed parent accounts from the default account mapping table.

```text
BM:CASH_IN_BANK_PARENT -> Cash in Banks
```

That mapping is seeded from `default_accounts` and copied to `company_default_accounts` when a company is created.

## Required Parent Account

The default COA template must include the Cash in Banks row:

| Field | Value |
|---|---|
| Account title | Cash in Banks |
| Account level | `SUB3` |
| Account type | `ASSET` |
| Account nature | `DEBIT` |
| Posting account | `false` |
| Status | `ACTIVE` |

The `default_accounts` table must include:

| Field | Value |
|---|---|
| `module_code` | `BM` |
| `account_role` | `CASH_IN_BANK_PARENT` |
| `default_chart_account_id` | Cash in Banks template row |
| `required_level` | `SUB3` |
| `usage_type` | `PARENT` |

When a company is created, the Cash in Banks row is copied into `chart_accounts`, and the mapping is copied into `company_default_accounts`. Bank Masterfile then uses the company-owned mapped row as the parent for generated bank accounts.

Optional Bank Masterfile mapping:

| Field | Value |
|---|---|
| `module_code` | `BM` |
| `account_role` | `CASH_ON_HAND_PARENT` |
| `default_chart_account_id` | Cash on Hand template row |
| `required_level` | `SUB3` |
| `usage_type` | `SELECTION_GROUP` |

This is useful if Bank Masterfile or cash account setup later needs to derive cash-account choices, but bank account generation itself should use `CASH_IN_BANK_PARENT`.

## Create Bank Flow

1. Validate bank input.
2. Begin database transaction.
3. Find the company's active `BM:CASH_IN_BANK_PARENT` mapping in `company_default_accounts`.
4. Generate the next `SPECIFIC` account code under that parent.
5. Create a `chart_accounts` row for the actual bank account.
6. Create the `bank_accounts` row linked to the generated COA row through `coaId`.
7. Commit the transaction.

Generated COA row:

| Field | Value |
|---|---|
| Parent | Company `CASH_IN_BANK_PARENT` row |
| Account level | `SPECIFIC` |
| Account title | Bank account name, or Cash in Bank - Bank - Branch - Account Number |
| Account type | `ASSET` |
| Account nature | `DEBIT` |
| Account group | Cash in Bank |
| Posting account | `true` |
| Currency | Bank currency |
| Status | Bank status |

## Important Rule

Bank Masterfile should not depend on pre-seeded Specific accounts like:

```text
Cash in Bank - BDO
Cash in Bank - BPI
Cash in Bank - Metrobank
```

Those names in the default COA workbook are generic starting accounts only. Actual bank records must be created by Bank Masterfile and linked to their generated COA accounts.

## Missing Parent Error

If the company does not have the Cash in Banks parent, bank creation must fail with:

```text
Cannot create bank account. Cash in Bank group was not found in Chart of Accounts. Please set up the Cash in Bank group first.
```

Once default COA template seeding is implemented, this should normally happen only if company provisioning failed or old company data has not been backfilled.

## Cash Disbursement Relationship

Cash disbursement credit accounts usually come from cash accounts:

| Credit source | Selection source |
|---|---|
| Cash on Hand | Active posting Specific accounts under Cash on Hand |
| Cash in Bank | Active Bank Masterfile records and their linked COA rows |
| Petty Cash | Active petty cash COA account or petty cash module account |

Debit account depends on the payment purpose:

| Payment purpose | Debit account | Credit account |
|---|---|---|
| Office supplies | Office Supplies Expense | Cash in Bank |
| Utility bill | Utilities Expense | Cash in Bank |
| Rent | Rent Expense | Cash in Bank |
| Employee reimbursement | Employee Receivable or Travel Expense | Cash in Bank |
| Supplier payment | Accounts Payable | Cash in Bank |
| Loan payment | Loan Payable | Cash in Bank |
| Asset purchase | Equipment or Furniture | Cash in Bank |
| Tax payment | Tax Expense or Withholding Tax Payable | Cash in Bank |

Bank Masterfile should expose/select only active banks for new cash disbursement transactions. Inactive banks remain available only for historical display and reports.

## Backend Adjustment After COA Anchors Exist

Current Bank Masterfile behavior uses title/group fuzzy matching to find Cash in Bank. After `default_accounts` and `company_default_accounts` exist, update the lookup order:

1. Find active `company_default_accounts` where `module_code = BM` and `account_role = CASH_IN_BANK_PARENT`.
2. Fall back to title/group matching only for migrated old companies.
3. Return the missing-parent validation error if neither lookup succeeds.

This keeps bank account generation stable even if the display title changes from Cash in Banks to another label later.
