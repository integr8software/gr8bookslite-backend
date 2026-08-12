# Company Accounting Seed Refactor

## Purpose

The accounting setup should move away from Super Admin-maintained default data and become system-owned, hardcoded company provisioning.

Chart of Accounts remains the core accounting structure. Default Accounts, Bank Masterfile, and Discount Management must all resolve their generated accounts from the company Chart of Accounts created by the system seed.

Target seed files:

```text
src/modules/maintenance/chart-of-accounts/seed/chart-of-accounts.seed.ts
src/modules/maintenance/default-account/seed/default-accounts.seed.ts
src/modules/maintenance/bank-masterfile/seed/bank-masterfile.seed.ts
```

Discount Management may keep its own seed helper, but it must depend on the Chart of Accounts seed in the same way Default Accounts and Bank Masterfile do.

## Current State To Remove

Current implementation uses platform template and mapping tables:

```text
default_chart_accounts
default_accounts
company_default_accounts
default_account_templates
```

Current flow:

1. Super Admin/platform seed creates `default_chart_accounts`.
2. Company provisioning copies `default_chart_accounts` into `chart_accounts`.
3. Platform `default_accounts` rows map module roles such as `BM:CASH_IN_BANK_PARENT`.
4. `company_default_accounts` copies those mappings per company.
5. Default Account records live in `default_account_templates`.

Target flow removes the Super Admin-maintained default COA template layer:

1. System code seeds each company's `chart_accounts` directly.
2. System code seeds company default account records directly.
3. Bank Masterfile and Discount Management locate their parent COA groups directly from seeded company COA rows.
4. No company-level mapping table is required.

## Target Prisma Direction

Remove these models/tables:

```text
DefaultChartAccount / default_chart_accounts
CompanyDefaultAccount / company_default_accounts
```

Remove the current platform-anchor meaning of:

```text
DefaultAccount / default_accounts
```

Rename the user/company maintenance table:

```text
DefaultAccountTemplate / default_account_templates
```

to:

```text
DefaultAccount / default_accounts
```

After the rename, `default_accounts` should mean only company-owned Default Account maintenance records.

Recommended final shape:

```text
chart_accounts
default_accounts
bank_accounts
discounts
```

`default_accounts` should keep the same fields currently held by `default_account_templates`. The migration is a naming/ownership change, not a field redesign.

Current generated COA links stay as-is:

```text
expense_coa_id
revenue_coa_id
asset_coa_id
accumulated_depreciation_coa_id
```

Do not add new fields only for the rename.

If a future Fixed Asset enhancement needs to track the generated group account directly, that should be a separate migration and product decision, for example:

```text
asset_group_coa_id
```

This avoids rediscovering the group through child parent IDs.

## COA Group Identification

Without `company_default_accounts`, backend services still need a reliable way to identify seeded COA branches such as Cash in Bank, Expenses, Revenue, Fixed Assets, Sales Discount, and Purchase Discount.

Using `accountGroup` is a good direction, but it should not be the only check unless the system controls and protects it. Because one COA row may need to serve more than one classification, `accountGroup` should become a JSON/string-array field instead of a single string. It works best as the primary classification tag list combined with hierarchy and account-type validation.

Recommended shape:

```text
accountGroup = ["Cash in Bank"]
accountGroup = ["Expenses", "Default Account Expense Parent"]
accountGroup = ["Fixed Assets", "Default Account Fixed Asset Parent"]
accountGroup = ["Sales Discount", "Discount Management Sales Parent"]
```

Recommended identification rule:

1. Use `accountGroup` array containment as the primary group classifier.
2. Confirm the account is in the expected COA branch by walking its parent chain.
3. Confirm the expected `accountType`, `accountNature`, and `accountLevel`.
4. For protected module groups, block edits that would change the identifying fields.

Recommended seeded `accountGroup` tags:

```text
Cash in Bank
Expenses
Revenue
Fixed Assets
Accumulated Depreciation
Depreciation Expense
Sales Discount
Purchase Discount
```

Recommended examples:

```text
Cash in Bank group:
- accountGroup contains Cash in Bank
- accountType = ASSET
- accountNature = DEBIT
- accountLevel != SPECIFIC
- active and not deleted
```

```text
Expense parent option:
- accountGroup contains Expenses
- accountType = EXPENSE
- accountNature = DEBIT
- accountLevel != SPECIFIC
- active and not deleted
```

```text
Sales Discount parent:
- accountGroup contains Sales Discount
- accountType = REVENUE
- accountNature = DEBIT
- accountLevel != SPECIFIC
- active and not deleted
```

This avoids the old mapping table while staying safer than plain title matching. Titles can be user-facing and may be renamed later; `accountGroup` should be treated as a system classification tag list once seeded.

If we want the strongest long-term approach, add a hidden system-owned classification field later, such as:

```text
system_account_key
```

Examples:

```text
COA:CASH_IN_BANK
COA:EXPENSES
COA:REVENUE
COA:FIXED_ASSETS
COA:SALES_DISCOUNT
COA:PURCHASE_DISCOUNT
```

That would be more stable than `accountGroup`, but it is not required for the first refactor if `accountGroup` is locked for seeded/protected rows.

## Replacing The Mapping Table In Code

The removed mapping table currently stores rows like:

```text
BM:CASH_IN_BANK_PARENT -> default_chart_account_id 8 -> SUB3
DA:EXPENSE_PARENT -> default_chart_account_id 134 -> SUB1
DA:REVENUE_PARENT -> default_chart_account_id 128 -> SUB1
DA:FIXED_ASSET_PARENT -> default_chart_account_id 55 -> SUB2
DA:ACCUMULATED_DEPRECIATION_PARENT -> default_chart_account_id 55 -> SUB2
DA:DEPRECIATION_EXPENSE_PARENT -> default_chart_account_id 161 -> SUB3
DSM:SALES_DISCOUNT_PARENT -> default_chart_account_id 178 -> SUB3
DSM:PURCHASE_DISCOUNT_PARENT -> default_chart_account_id 189 -> SUB3
```

After removing `default_chart_accounts` and `company_default_accounts`, do not look up `default_chart_account_id`. Those IDs only existed in the platform template table.

Instead, make the mapping a hardcoded resolver catalog in the backend:

```ts
export const SystemAccountGroups = {
  bankMasterfile: {
    cashInBankParent: {
      accountGroupIncludes: 'Cash in Bank',
      requiredLevel: 'SUB3',
      accountType: 'ASSET',
      accountNature: 'DEBIT',
    },
  },
  defaultAccount: {
    expenseParent: {
      accountGroupIncludes: 'Expenses',
      requiredLevel: 'SUB1',
      accountType: 'EXPENSE',
      accountNature: 'DEBIT',
    },
    revenueParent: {
      accountGroupIncludes: 'Revenue',
      requiredLevel: 'SUB1',
      accountType: 'REVENUE',
      accountNature: 'CREDIT',
    },
    fixedAssetParent: {
      accountGroupIncludes: 'Fixed Assets',
      requiredLevel: 'SUB2',
      accountType: 'ASSET',
      accountNature: 'DEBIT',
    },
    accumulatedDepreciationParent: {
      accountGroupIncludes: 'Accumulated Depreciation',
      requiredLevel: 'SUB2',
      accountType: 'ASSET',
      accountNature: 'CREDIT',
    },
    depreciationExpenseParent: {
      accountGroupIncludes: 'Depreciation Expense',
      requiredLevel: 'SUB3',
      accountType: 'EXPENSE',
      accountNature: 'DEBIT',
    },
  },
  discountManagement: {
    salesDiscountParent: {
      accountGroupIncludes: 'Sales Discount',
      requiredLevel: 'SUB3',
      accountType: 'REVENUE',
      accountNature: 'DEBIT',
    },
    purchaseDiscountParent: {
      accountGroupIncludes: 'Purchase Discount',
      requiredLevel: 'SUB3',
      accountType: 'EXPENSE',
      accountNature: 'CREDIT',
    },
  },
} as const;
```

Then each module calls a shared resolver:

```ts
async function findSystemAccountGroupOrThrow(tx, companyId, definition) {
  const account = await tx.chartAccount.findFirst({
    where: {
      companyId,
      accountGroup: {
        array_contains: definition.accountGroupIncludes,
      },
      accountLevel: definition.requiredLevel,
      accountType: definition.accountType,
      accountNature: definition.accountNature,
      status: 'ACTIVE',
      deletedAt: null,
      isPostingAccount: false,
    },
    orderBy: [{ accountCode: 'asc' }],
  });

  if (!account) {
    throw new Error(
      `Required system account group was not found: ${definition.accountGroupIncludes}.`,
    );
  }

  return account;
}
```

This is how the old table behavior is preserved without the table:

| Old field | New source |
|---|---|
| `module_code` | The owning backend module/service, such as Bank Masterfile or Discount Management |
| `account_role` | A code-level resolver key, such as `cashInBankParent` |
| `default_chart_account_id` | No longer needed; resolved from company `chart_accounts` |
| `required_level` | The hardcoded resolver definition |

Important distinction:

- `module_code` is not stored on the COA row. It is implied by which module is calling the resolver.
- `account_role` is not stored on the COA row. It becomes the resolver name in code.
- `accountGroup` is stored on `chart_accounts` as a JSON/string-array and is used by the resolver to classify the matching COA branch.

Example:

```text
Old database mapping:
BM + CASH_IN_BANK_PARENT
```

becomes:

```text
Bank Masterfile service calls:
SystemAccountGroups.bankMasterfile.cashInBankParent
```

which resolves a company COA row matching:

```text
accountGroup contains Cash in Bank
accountLevel = SUB3
accountType = ASSET
accountNature = DEBIT
```

Important rule:

- Do not use database IDs for these parent accounts.
- Do not use user-facing account title alone.
- Do use `accountGroup` array containment, `accountLevel`, `accountType`, `accountNature`, active status, and parent-chain validation where needed.

This keeps the mapping system-owned while removing the extra table.

## Seed Ownership

### Chart Of Accounts Seed

`chart-of-accounts.seed.ts` becomes the single source of truth for required company COA rows.

It must create the base tree needed by:

- Core accounting.
- Bank Masterfile.
- Default Accounts.
- Discount Management.

Required protected groups include:

```text
Cash in Bank
Expenses
Revenue / Collection income parent
Fixed Assets
Accumulated Depreciation
Depreciation Expense
Sales Discount
Purchase Discount
```

The seed should return or expose stable resolver helpers for required groups, for example:

```ts
findSeededCashInBankGroup(tx, companyId)
findSeededExpenseParents(tx, companyId)
findSeededRevenueParents(tx, companyId)
findSeededFixedAssetParents(tx, companyId)
findSeededDiscountParents(tx, companyId)
```

Use `accountGroup` array containment plus hierarchy/type checks for the first implementation. If the table later gets a dedicated system key column, prefer that over `accountGroup`. Avoid fuzzy title matching.

### Default Accounts Seed

`default-accounts.seed.ts` should seed company-owned records into `default_accounts`.

Default Account records are not platform anchors. They are user-facing business templates linked to generated or seeded company COA accounts.

Supported types remain:

```text
EXPENSE
COLLECTION
FIXED_ASSET
```

### Bank Masterfile Seed

`bank-masterfile.seed.ts` must depend on the `Cash in Bank` group created by the COA seed.

Bank Masterfile creates bank-owned specific posting accounts under `Cash in Bank`. The seed can create starter inactive bank records if product still wants defaults, but the source parent is the company COA group, not `company_default_accounts`.

## Protected Cash In Bank Rules

`Cash in Bank` is a protected COA group.

Rules:

- Bank Masterfile is the owner of specific posting accounts under `Cash in Bank`.
- Users cannot manually add a specific COA account under `Cash in Bank` from the COA screen.
- Users cannot move a non-bank account into `Cash in Bank`.
- Users cannot move a Bank Masterfile-linked account out of `Cash in Bank`.
- The `Cash in Bank` group cannot be reparented outside its seeded parent.
- Specific child accounts under `Cash in Bank` can only be created, activated, inactivated, or renamed through Bank Masterfile rules.

COA validation should detect this group directly from the seeded company COA row. It should not require `company_default_accounts`.

Recommended error copy:

```text
Cash in Bank accounts are managed through Bank Masterfile.
```

```text
Cash in Bank cannot be moved outside its seeded account group.
```

## Default Account Expense Type Adjustment

Expense Type needs an additional parent selector.

Frontend:

- Add a dropdown field for Expense parent account.
- Use the shared advanced dropdown:

```text
gr8bookslite-frontend/app/src/ui/shared/advanced-dropdown/
```

- The dropdown fetches active, non-specific sub accounts under the seeded Expenses tree.
- It should not show inactive accounts.
- It should not show posting/specific accounts.
- It should not show accounts outside Expenses.

Backend:

- Create request should include the selected expense parent COA ID.
- Backend validates the selected parent:
  - belongs to the same company,
  - is active,
  - is not `SPECIFIC`,
  - is inside Expenses,
  - is not a protected module-owned group that blocks manual children.
- Generated expense account is created as a `SPECIFIC` posting child under the selected parent.

Movement rule:

- An Expense Type generated account can only be moved within the Expenses tree.
- It cannot be moved to Assets, Liabilities, Equity, Revenue, Cash in Bank, Sales Discount, Purchase Discount, or another protected module group.

Recommended request shape:

```ts
type CreateDefaultAccountRequest = {
  type: 'EXPENSE' | 'COLLECTION' | 'FIXED_ASSET';
  defaultAccountName: string;
  description?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  expenseParentCoaId?: string;
};
```

For `EXPENSE`, `expenseParentCoaId` should be required.

## Collection Type Adjustment

Current behavior creates one revenue posting account for `COLLECTION`.

Available adjustment:

- Add the same parent-selection pattern as Expense, but scoped to Revenue or a dedicated Collection Income tree.
- The frontend dropdown can fetch active, non-specific sub accounts under Revenue.
- Backend creates the generated revenue account as a `SPECIFIC` posting child under the selected Revenue parent.

Recommended behavior:

```text
Revenue / Collection Income parent
  {Default Account Name}
```

Validation:

- Selected parent must belong to the company.
- Selected parent must be active.
- Selected parent must be inside the Revenue tree.
- Selected parent must not be `SPECIFIC`.
- Generated account must be `REVENUE`, `CREDIT`, and posting.

Movement rule:

- Collection generated accounts can only move within Revenue or the configured Collection Income branch.
- They cannot move to Expenses or Assets.

If no product-specific collection categories are needed yet, keep current behavior and resolve the seeded Revenue parent automatically. The dropdown can be added later without changing the accounting model.

## Fixed Asset Type Adjustment

Current behavior creates:

```text
Fixed asset group
  Asset posting account
  Accumulated Depreciation posting account

Depreciation Expense posting account
```

Available adjustments:

1. Keep automatic parent resolution.
2. Add controlled parent dropdowns.

Recommended first implementation is to keep automatic parent resolution because Fixed Asset creates multiple linked accounts and mistakes are harder to repair.

If dropdowns are added, use separate scoped selectors:

```text
Fixed Asset parent: active non-specific account under Fixed Assets
Accumulated Depreciation parent: active non-specific account under Accumulated Depreciation
Depreciation Expense parent: active non-specific account under Depreciation Expense / Expenses
```

Recommended generated structure:

```text
Fixed Assets
  {Default Account Name}
    {Default Account Name}
    Accumulated Depreciation - {Default Account Name}

Depreciation Expense
  Depreciation Expense - {Default Account Name}
```

Important accounting note:

- Accumulated Depreciation is normally a contra-asset account.
- It should remain in the asset area but carry credit/contra behavior if the current COA supports that distinction.
- If the current enum model cannot express contra-asset separately, keep the current `ASSET` type and use `contraAccount = true` or account nature rules consistently.

Possible future schema adjustment:

```text
asset_group_coa_id
asset_coa_id
accumulated_depreciation_coa_id
expense_coa_id
```

For this rename/refactor, keep the current fields unchanged.

Movement rules:

- Fixed Asset generated group can only stay inside Fixed Assets.
- Asset posting account can only stay inside its generated Fixed Asset group or another valid Fixed Asset group if product allows transfer.
- Accumulated Depreciation account can only stay inside the linked Fixed Asset group or the seeded Accumulated Depreciation branch, depending on the final structure.
- Depreciation Expense account can only stay inside Expenses / Depreciation Expense.
- Moving only one linked account should be blocked unless the backend can preserve the whole linked set correctly.

Recommended error copy:

```text
Fixed Asset accounts are linked. Move the full fixed asset setup or keep each account in its required branch.
```

## Discount Management Dependency

Discount Management currently resolves parents through `company_default_accounts`.

After removing `company_default_accounts`, it must resolve directly from seeded COA groups:

```text
Sales Discount
Purchase Discount
```

Rules:

- Sales discounts create/link specific posting accounts under Sales Discount.
- Purchase discounts create/link specific posting accounts under Purchase Discount.
- Users should not manually move discount-generated accounts outside their discount branch.
- If the discount name/type changes, the backend either renames the linked COA account or links to a new account under the correct seeded parent.

## Future Module COA Integration Rule

Any future module that creates, updates, renames, moves, activates, inactivates, or links a Chart of Accounts record must use the same system account group resolver pattern.

This applies to modules that:

- create a new account title,
- update an existing account title,
- generate a posting account,
- select a parent COA account,
- move a COA account between branches,
- link a module record to a COA account,
- change status for a module-owned COA account.

Future modules should not add a new mapping table. They should add a code-level resolver definition and use `accountGroup` tags on `chart_accounts`.

Recommended future module pattern:

```ts
export const SystemAccountGroups = {
  futureModule: {
    targetParent: {
      accountGroupIncludes: 'Future Module Parent',
      requiredLevel: 'SUB3',
      accountType: 'EXPENSE',
      accountNature: 'DEBIT',
    },
  },
} as const;
```

The seeded COA row may carry multiple tags if it serves multiple modules:

```text
accountGroup = ["Expenses", "Future Module Parent", "Default Account Expense Parent"]
```

Required rules for future modules:

- Resolve parent accounts through the shared resolver.
- Validate `accountGroup` array containment.
- Validate `accountLevel`, `accountType`, `accountNature`, active status, and company ownership.
- Validate the parent chain when a module must stay inside a specific branch.
- Store the final linked `chart_account_id` on the module record.
- Never store only account title as the durable accounting link.
- Never infer ownership from account title text alone.
- Do not allow moving a module-owned COA account outside its allowed `accountGroup` branch.
- Do not let ordinary COA editing break protected module tags.

When a module updates an account title:

1. Load the linked `chart_account_id`.
2. Validate that the account still belongs to the expected `accountGroup`.
3. Validate the account is not locked by posted transactions if that rule applies.
4. Rename the COA account in the same transaction as the module record update.
5. Keep the `chart_account_id` stable unless the module intentionally relinks to a different valid COA account.

This makes COA integration consistent for Bank Masterfile, Default Accounts, Discount Management, and later modules.

## Migration Notes

Implementation should happen in phases:

1. Create the new documentation-backed seed helpers.
2. Add deterministic COA parent resolver helpers that do not use `company_default_accounts`.
3. Update Bank Masterfile, Default Account, Discount Management, and COA Bank Sync to use those resolvers.
4. Rename `default_account_templates` to `default_accounts`.
5. Remove old platform-anchor `default_accounts`.
6. Remove `company_default_accounts`.
7. Remove `default_chart_accounts`.
8. Update company provisioning to call:

```ts
await seedCompanyChartAccounts(tx, companyId);
await seedCompanyDefaultAccounts(tx, companyId);
await seedCompanyBankMasterfileDefaults(tx, companyId);
await seedCompanyDiscountMaintenanceDefaults(tx, companyId);
```

COA must run first.

## Validation Checklist

- New company gets required Chart of Accounts rows.
- Cash in Bank group exists and is protected.
- Bank Masterfile can create a bank-specific account under Cash in Bank.
- COA screen cannot manually create a specific account under Cash in Bank.
- Default Account Expense Type requires an Expenses parent selection.
- Expense generated accounts cannot move outside Expenses.
- Collection generated accounts remain under Revenue or Collection Income.
- Fixed Asset generated linked accounts remain in their required branches.
- Discount Management can create Sales and Purchase discount accounts without `company_default_accounts`.
- No runtime service depends on `default_chart_accounts` or `company_default_accounts`.
