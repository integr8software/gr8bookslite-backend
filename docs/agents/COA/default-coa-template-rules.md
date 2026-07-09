# Default COA Template Rules

Use these rules when adding or changing seeded Chart of Accounts defaults for any module.

## Placement

- Collection defaults belong under `Service Revenues`. The posting account title should match the user-facing default account title, such as `Service Fees`.
- Expense defaults belong under `Administrative Expenses` unless a module has a more specific approved expense parent. The posting account title should match the default account title.
- Fixed asset defaults belong under `Property, Plant and Equipment`. Each fixed asset group should include the asset posting account and an `Accumulated Depreciation - {title}` posting account.
- Fixed asset defaults also need a matching `Depreciation Expense - {title}` posting account under the configured depreciation expense parent.

## Status Sync

- `StandardDefaultChartAccounts` in `src/modules/maintenance/chart-of-accounts/seed/chart-of-accounts-defaults.seed.ts` is the active company COA seed list.
- Company COA seeding must copy both active and inactive template rows so default status changes are reflected in each company copy.
- Inactive copied rows should have `deletedAt` set; active copied rows should clear `deletedAt`.
- `StandardDefaultAccountMappings` in `src/modules/maintenance/chart-of-accounts/seed/chart-of-accounts-system-groups.seed.ts` is the active module account-group mapping list.

## Mapping Rules

- Add platform mappings only after confirming the referenced account code exists in `StandardDefaultChartAccounts`.
- Collection-type module mappings should point to the Service Revenues parent.
- Expense-type module mappings should point to Administrative Expenses or the approved module-specific expense parent.
- Fixed-asset module mappings should point to the PP&E parent, accumulated depreciation parent, and depreciation expense parent required by that module.

## Account Shape

- Parent/group rows are non-posting accounts.
- Generated default account rows are `SPECIFIC` posting accounts.
- Collection accounts use `REVENUE` and `CREDIT`.
- Expense and depreciation expense accounts use `EXPENSE` and `DEBIT`.
- Fixed asset accounts use `ASSET` and `DEBIT`.
- Accumulated depreciation accounts are contra-asset accounts and should be kept paired with their fixed asset account.
