# Chart of Accounts and Bank Masterfile Sync Rules

## Purpose

Chart of Accounts and Bank Masterfile records that represent the same bank account must be treated as one synchronized business record.

The Bank Masterfile owns the bank details. Chart of Accounts owns the accounting hierarchy and posting account. Both sides must exist and contain the required information before the pair can be activated or used in new transactions.

## Core Rule

A synchronized Bank Masterfile and Chart of Accounts pair must remain inactive until both records are complete.

This Bank Masterfile sync applies only when the COA account is under the backend Cash in Bank parent/category. Other COA categories must not be treated as Bank Masterfile records.

If either side is missing required information, the system must:

- Keep the Bank Masterfile record inactive.
- Keep the linked Chart of Accounts record inactive.
- Block activation from either module.
- Return a validation message explaining which side is incomplete.

The system must not allow an active bank record with a missing or incomplete COA posting account, and it must not allow an active COA bank posting account with a missing or incomplete Bank Masterfile record.

## Backend Scope Rule

The backend must classify a COA account as Bank Masterfile-synchronized only when its category or parent resolves to Cash in Bank / Cash in Banks.

Bank Masterfile sync should apply when:

- The COA account is a `SPECIFIC` posting account under the company `BM:CASH_IN_BANK_PARENT` mapping.
- The COA account's parent is the company Cash in Banks account.
- The COA account is being created by the Bank Masterfile backend flow.

Bank Masterfile sync should not apply when:

- The COA account belongs to Cash on Hand, Petty Cash, Accounts Receivable, Sales Discounts, Purchase Discounts, or any other category.
- The COA account title happens to contain bank-like text but its parent/category is not Cash in Bank.
- A future module owns the account category and has its own sync rule.

Backend activation logic must therefore check the COA parent/category before requiring a Bank Masterfile link. If the parent/category is Cash in Bank, the record is bank-owned and must follow this document. If the parent/category is not Cash in Bank, Bank Masterfile validation must not block activation.

## Required Bank Masterfile Information

A bank record cannot be activated until it has:

| Field | Rule |
|---|---|
| Bank | Required |
| Account Name | Required |
| Account Number | Required |
| Account Type | Required when configured by company policy |
| Branch | Required when configured by company policy |
| Currency Type | Required |
| Currency Exchange Rate | Required when currency is not the company base currency |
| Linked COA ID or Account Code | Required |
| Status | Must be `INACTIVE` until the linked COA is complete |

## Required Chart of Accounts Information

A linked COA account cannot be activated until it has:

| Field | Rule |
|---|---|
| Parent Account | Must be under the company Cash in Banks parent account |
| Account Code | Required and unique within the company |
| Account Title | Required |
| Account Level | Must be `SPECIFIC` |
| Account Type | Must be `ASSET` |
| Account Nature | Must be `DEBIT` |
| Posting Account | Must be `true` |
| Currency | Must match the bank record currency when currency is enabled |
| Linked Bank ID | Required |
| Status | Must be `INACTIVE` until the linked Bank Masterfile is complete |

## Activation Rules

Activation must run a sync validation before status changes.

### Activating From Bank Masterfile

1. Load the bank record.
2. Load the linked COA record.
3. Validate required Bank Masterfile fields.
4. Validate required COA fields.
5. Validate that the COA account belongs under Cash in Banks.
6. If all validations pass, activate both records in the same database transaction.
7. If any validation fails, keep both records inactive.

### Activating From Chart of Accounts

1. Load the COA record.
2. Determine whether the COA account is a bank-synchronized account.
3. Load the linked bank record.
4. Validate required COA fields.
5. Validate required Bank Masterfile fields.
6. If all validations pass, activate both records in the same database transaction.
7. If any validation fails, keep both records inactive.

## Adding a Bank From Chart of Accounts

Users may create a bank account from the Chart of Accounts screen by selecting a Cash in Bank parent/category. This should not create a plain COA-only account.

When the selected parent/category is Cash in Bank / Cash in Banks, the backend must treat the save request as a combined COA plus Bank Masterfile setup.

Recommended backend flow:

1. Validate the base COA input.
2. Resolve the selected parent/category.
3. If the parent/category is Cash in Bank, require or accept a `bankDetails` payload.
4. Begin a database transaction.
5. Create the COA posting account under Cash in Banks with `INACTIVE` status.
6. Create the Bank Masterfile record with `INACTIVE` status.
7. Link the Bank Masterfile record to the COA record using internal IDs.
8. Run the shared sync completeness validator.
9. Activate both records only when COA and bank details are complete.
10. Commit the transaction.

If the user saves a Cash in Bank COA account without complete bank details, the backend may save the incomplete pair as inactive, but it must not create an active COA-only bank account.

Suggested request shape:

```ts
type CreateChartAccountRequest = {
  accountCode?: string;
  accountTitle: string;
  parentAccountId: string;
  accountLevel: 'SPECIFIC';
  accountType: 'ASSET';
  accountNature: 'DEBIT';
  currencyCode?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  linkedDetails?: {
    kind: 'BANK';
    bankName?: string;
    branch?: string;
    accountName?: string;
    accountNumber?: string;
    accountType?: string;
    currencyCode?: string;
    currencyExchangeRate?: number;
    seriesStart?: string;
    seriesEnd?: string;
    seriesDigits?: number;
  };
};
```

The backend should infer `linkedDetails.kind = 'BANK'` from the Cash in Bank parent/category when the client does not send it. The parent/category remains the source of truth for which linked module applies.

## Creation Rules

New synchronized records should be created as inactive first.

Recommended create flow:

1. Validate the available input.
2. Begin a database transaction.
3. Create or update the Bank Masterfile record with `INACTIVE` status.
4. Create or update the linked COA posting account with `INACTIVE` status.
5. Store the internal link on both sides.
6. Run sync completeness validation.
7. Activate both records only when all required fields are present.
8. Commit the transaction.

This prevents partially configured records from becoming selectable in transactions.

## Inactivation Rules

When a synchronized bank account is manually inactivated:

- The Bank Masterfile record must become inactive.
- The linked COA posting account should become inactive when it is not required by another active dependency.
- Existing transactions must remain valid for historical reporting.
- The inactive pair must not appear in new transaction selection lists.

If the COA account cannot be inactivated because of accounting controls, the Bank Masterfile can still be inactive, but new transactions must remain blocked from selecting that bank.

## Suggested Validation Messages

When the bank side is incomplete:

```text
Cannot activate bank account. Bank Masterfile information is incomplete.
```

When the COA side is incomplete:

```text
Cannot activate bank account. The linked Chart of Accounts posting account is incomplete.
```

When the link is missing:

```text
Cannot activate bank account. Bank Masterfile and Chart of Accounts are not linked.
```

When the Cash in Banks parent is missing:

```text
Cannot activate bank account. Cash in Banks was not found in Chart of Accounts.
```

## Sync Ownership

| Concern | Source of truth |
|---|---|
| Bank name, branch, account number, account type | Bank Masterfile |
| Check series | Bank Masterfile |
| Account code | Chart of Accounts |
| Parent account | Chart of Accounts |
| Account type and nature | Chart of Accounts |
| Posting status | Chart of Accounts |
| Active/inactive eligibility | Shared sync validator |

Display names may be derived from both records, but the sync validator decides whether the pair can become active.

## COA Form Refactor Guidance

The Chart of Accounts form should be refactored into a category-aware form instead of adding bank-only fields directly into the base COA fields.

Recommended form structure:

```text
Chart of Accounts Form
- Account Details
- Accounting Settings
- Linked Module Details
  - Bank Details, shown only for Cash in Bank / Cash in Banks
  - Discount Details, shown only for Sales Discount or Purchase Discount categories
  - Future category-specific panels
```

Bank details may be displayed as a tab, section, or step. A tab is preferred when the form already has many fields because it keeps the base COA fields clean while still making the linked setup discoverable.

Do not add bank-specific columns or controls to every COA account form state. Only show Bank Details after the selected parent/category resolves to Cash in Bank.

The form should support future linked modules through the same pattern:

| Parent/category | Linked details panel | Backend linked kind |
|---|---|---|
| Cash in Bank / Cash in Banks | Bank Details | `BANK` |
| Sales Discounts | Discount Details | `SALES_DISCOUNT` |
| Purchase Discounts | Discount Details | `PURCHASE_DISCOUNT` |
| Bank Charges or Finance Charges | Charge Details | `BANK_CHARGE` |

This keeps the Chart of Accounts module as the accounting shell while each business module owns its own required details.

## Future Reusable Sync Pattern

This same pattern should be reusable for other account categories that generate or depend on COA posting accounts.

Examples:

| Module or category | COA account naming pattern | Parent account source |
|---|---|---|
| Bank Masterfile | `Cash in Bank - [bank/account name]` | Cash in Banks |
| Sales discount management | `Sales Discount - [discount name]` | Sales Discounts |
| Purchase discount management | `Purchase Discount - [discount name]` | Purchase Discounts |
| Payment charges | `Bank Charge - [charge name]` | Bank Charges or Finance Charges |

For discount management, if a discount is classified as sales-related, the generated or linked COA account should use:

```text
Sales Discount - [name of the discount]
```

The same inactive-until-complete rule should apply:

- The discount setup remains inactive until the required discount information exists.
- The linked COA account remains inactive until required accounting information exists.
- Activation must update both records together in one transaction.
- If either side is incomplete, both records remain inactive.

## Implementation Notes

- Use internal IDs for links between synchronized records.
- Do not rely on account titles as permanent foreign keys.
- Keep sync validation in a shared service so future modules can reuse the same activation behavior.
- Run activation and inactivation in database transactions.
- Selection APIs must only return active synchronized records that passed validation.
- Historical reports may still show inactive synchronized records when they were used by old transactions.
