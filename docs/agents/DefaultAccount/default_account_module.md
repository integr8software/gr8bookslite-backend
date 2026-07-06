# Default Account Templates Module Requirements

## 1. Module Name

**Default Account Templates Module**

User-facing label:

```text
Default Account
```

## 2. Purpose

The Default Account Templates module is used to maintain company-owned predefined account templates that automatically create the required **Chart of Accounts** posting accounts.

This module must follow the same design, coding standards, architecture, validation style, and behavior used by the existing **Bank Masterfile** module.

When a Default Account Template record is created, the system must create the corresponding Chart of Accounts record or records using the existing Chart of Accounts service. Generated accounts must be placed under the correct company-owned parent accounts from `company_default_accounts`.

Important naming note:

- The existing Prisma model/table `DefaultAccount` / `default_accounts` is already used for platform COA anchor mappings such as `BM:CASH_IN_BANK_PARENT`.
- Do not reuse that table for user-created Default Account Template records.
- This new maintenance module should use a separate model/table, recommended as `DefaultAccountTemplate` / `default_account_templates`.
- The existing `default_accounts` table should only be changed by adding the new `DA:*` anchor mappings required by this module.

---

## 3. Supported Account Types

| Type | Description | Generated COA accounts |
|---|---|---:|
| `EXPENSE` | Expense Type | 1 |
| `COLLECTION` | Collection Type | 1 |
| `FIXED_ASSET` | Fixed Asset Type | 3 |

Recommended display labels:

| Backend value | UI label |
|---|---|
| `EXPENSE` | Expense Type |
| `COLLECTION` | Collection Type |
| `FIXED_ASSET` | Fixed Asset Type |

---

## 4. Database Fields

### Table: `default_account_templates`

Use the existing project naming convention if a different table prefix is already used for maintenance modules.

| Field | Data Type | Required | Description |
|---|---:|---:|---|
| `id` | bigint / int identity | Yes | Primary key |
| `company_id` | int | Yes | Owning company |
| `type` | varchar(50) | Yes | `EXPENSE`, `COLLECTION`, or `FIXED_ASSET` |
| `description` | varchar(250) | Yes | Template/account description |
| `status` | varchar(20) | Yes | `ACTIVE` or `INACTIVE` |
| `expense_coa_id` | bigint | No | Linked generated expense COA for `EXPENSE`, or depreciation expense COA for `FIXED_ASSET` |
| `revenue_coa_id` | bigint | No | Linked generated revenue COA for `COLLECTION` |
| `asset_coa_id` | bigint | No | Linked generated asset COA for `FIXED_ASSET` |
| `accumulated_depreciation_coa_id` | bigint | No | Linked generated accumulated depreciation COA for `FIXED_ASSET` |
| `date_created` | datetime | Yes | Created timestamp |
| `date_modified` | datetime | No | Last modified timestamp |
| `who_created` | varchar(50) | No | User who created the record |
| `who_modified` | varchar(50) | No | User who last modified the record |
| `deleted_at` | datetime | No | Soft delete marker, if used by the project |

Recommended constraints:

```text
UNIQUE(company_id, type, description)
```

If the project uses case-insensitive duplicate checks at service level, keep that same pattern and normalize whitespace before comparing descriptions.

Recommended Prisma model name:

```text
DefaultAccountTemplate
```

Do not rename the existing `DefaultAccount` Prisma model unless the whole COA anchor mapping architecture is refactored separately.

---

## 5. Required Parent Account Mappings

Default Account Templates must use company-owned COA anchors in `company_default_accounts`, following the Bank Masterfile pattern.

Recommended module code:

```text
DA
```

Required platform `default_accounts` mappings:

| `module_code` | `account_role` | Points to template row | Required level | Usage |
|---|---|---|---|---|
| `DA` | `EXPENSE_PARENT` | Expenses parent/group | `SUB3` or configured parent level | `PARENT` |
| `DA` | `REVENUE_PARENT` | Revenue parent/group | `SUB3` or configured parent level | `PARENT` |
| `DA` | `FIXED_ASSET_PARENT` | Fixed Assets parent/group | `SUB3` or configured parent level | `PARENT` |
| `DA` | `ACCUMULATED_DEPRECIATION_PARENT` | Accumulated Depreciation parent/group | `SUB3` or configured parent level | `PARENT` |
| `DA` | `DEPRECIATION_EXPENSE_PARENT` | Depreciation Expense or Expenses parent/group | `SUB3` or configured parent level | `PARENT` |

When a company is created, these mappings must be copied into `company_default_accounts` the same way `BM:CASH_IN_BANK_PARENT` is copied for Bank Masterfile.

Fallback title matching may be used only for migrated old companies. New implementation should prefer `company_default_accounts`.

### 5.1 Required Seed Changes

Update the standard default COA mapping seed to include the `DA:*` mappings.

Current seed location:

```text
gr8bookslite-backend/prisma/seeds/standardDefaultCoaTemplate.ts
```

The implementation must add entries to `StandardDefaultAccountMappings` only after confirming the referenced account titles exist in `StandardDefaultChartAccounts`.

Recommended mapping targets:

| Mapping | Preferred target title | Fallback target title |
|---|---|---|
| `DA:EXPENSE_PARENT` | Expenses or Operating Expenses group | Nearest active Expense parent/group |
| `DA:REVENUE_PARENT` | Revenue or Revenues group | Nearest active Revenue parent/group |
| `DA:FIXED_ASSET_PARENT` | Fixed Assets | Property and Equipment or nearest fixed asset parent |
| `DA:ACCUMULATED_DEPRECIATION_PARENT` | Accumulated Depreciation | Nearest accumulated depreciation parent |
| `DA:DEPRECIATION_EXPENSE_PARENT` | Depreciation Expense | Expenses parent/group |

If the standard COA template does not contain a required target parent, update the template seed first. The Default Account Templates module must not create missing parent groups at runtime.

### 5.2 Existing Company Backfill

For existing companies, add a backfill/migration task that copies the new active `DA:*` platform mappings into `company_default_accounts`, resolving each mapping through that company's copied `chart_accounts` rows.

Backfill rules:

- Do not create duplicate `company_default_accounts` rows.
- Do not overwrite an existing active company mapping unless explicitly requested by an admin repair task.
- Report companies where a mapped parent account cannot be resolved.
- Keep company activation or module usage blocked until required mappings exist.

---

## 6. Main Features

### 6.1 List and Search Default Accounts

Users must be able to view and search Default Account Template records.

Expected behavior:

- Display records in the same list/table style as Bank Masterfile.
- Support search by description and type.
- Support type and status filters if the shared list component already supports filters.
- Show linked generated Chart of Accounts codes or titles where useful.
- Exclude soft-deleted records from the default list.

### 6.2 Create Default Account

Users must be able to create a Default Account Template by selecting a type and entering a description.

Expected behavior:

- Validate required fields.
- Prevent duplicate descriptions per company and type.
- Begin a database transaction.
- Resolve the required parent account mapping or mappings from `company_default_accounts`.
- Generate the next `SPECIFIC` account code under each parent using the existing Chart of Accounts code generation logic.
- Create all required Chart of Accounts records through the Chart of Accounts service/repository.
- Save the Default Account Template record linked to the generated COA row or rows.
- Commit only when every required record is created successfully.
- Roll back the Default Account Template and all generated COA records if any step fails.

### 6.3 Edit Default Account

Users must be able to edit an existing Default Account Template description and status.

Expected behavior:

- Validate that the record exists.
- Prevent duplicate descriptions per company and type.
- Update audit fields.
- If `description` changes, update generated Chart of Accounts titles in the same transaction.
- If linked COA accounts are already used by transactions and the project blocks renaming used accounts, return the existing Chart of Accounts validation message and do not partially update.
- Type should not be editable after creation because changing type changes the number and accounting nature of linked COA accounts.

### 6.4 Delete Default Account

Users must be able to delete a Default Account Template only when allowed by accounting dependency rules.

Expected behavior:

- Prefer soft delete or inactive status over physical delete, matching project behavior.
- Do not delete generated Chart of Accounts records that are used in transactions.
- If no transactions use the generated COA accounts, inactivate or soft-delete the linked COA accounts in the same transaction.
- Return a validation error when any linked COA account cannot be deleted or inactivated.

### 6.5 Activate and Inactivate

Default Account Template status should stay synchronized with generated COA accounts where allowed.

Expected behavior:

- Inactivating a Default Account Template should inactivate generated COA accounts when they are not required by another active dependency.
- Activating a Default Account Template should validate that all linked COA accounts exist, are complete, and are under the correct mapped parent accounts.
- Activation and inactivation must run in a database transaction.

---

## 7. Type-Specific COA Generation

### 7.1 Expense Type

Fields:

| Field | Required | Notes |
|---|---:|---|
| `description` | Yes | Example: Office Supplies |

Generated Chart of Accounts:

| Field | Value |
|---|---|
| Parent | Company `DA:EXPENSE_PARENT` |
| Account level | `SPECIFIC` |
| Account title | Same as `description` |
| Account type | `EXPENSE` |
| Account nature | `DEBIT` |
| Posting account | `true` |
| Status | Same as Default Account Template status |

Example:

```text
Expenses
  Office Supplies
```

### 7.2 Collection Type

Fields:

| Field | Required | Notes |
|---|---:|---|
| `description` | Yes | Example: Permit Fees |

Generated Chart of Accounts:

| Field | Value |
|---|---|
| Parent | Company `DA:REVENUE_PARENT` |
| Account level | `SPECIFIC` |
| Account title | Same as `description` |
| Account type | `REVENUE` |
| Account nature | `CREDIT` |
| Posting account | `true` |
| Status | Same as Default Account Template status |

Example:

```text
Revenue
  Permit Fees
```

### 7.3 Fixed Asset Type

Fields:

| Field | Required | Notes |
|---|---:|---|
| `description` | Yes | Example: Computer Equipment |

Generated Chart of Accounts:

| Generated account | Parent mapping | Account title | Account type | Nature |
|---|---|---|---|---|
| Fixed Asset Account | `DA:FIXED_ASSET_PARENT` | Same as `description` | `ASSET` | `DEBIT` |
| Accumulated Depreciation Account | `DA:ACCUMULATED_DEPRECIATION_PARENT` | `Accumulated Depreciation - {description}` | `ASSET` | `CREDIT` |
| Depreciation Expense Account | `DA:DEPRECIATION_EXPENSE_PARENT` | `Depreciation Expense - {description}` | `EXPENSE` | `DEBIT` |

All three generated accounts must be:

- `SPECIFIC`
- Posting accounts
- Linked to the same Default Account Template record
- Created in one database transaction

Example:

```text
Assets
  Computer Equipment

Accumulated Depreciation
  Accumulated Depreciation - Computer Equipment

Expenses
  Depreciation Expense - Computer Equipment
```

---

## 8. Validation Rules

| Validation | Rule |
|---|---|
| Type | Required; must be `EXPENSE`, `COLLECTION`, or `FIXED_ASSET` |
| Description | Required; trim whitespace before save |
| Duplicate description | Prevent duplicate active records with the same company, type, and normalized description |
| Parent mapping | Required parent mappings must exist in `company_default_accounts` |
| Account code | Generated by backend only; must be unique per company |
| Linked COA | All generated COA rows must be linked by internal IDs |
| Transactions | Used COA accounts cannot be deleted, reparented, or renamed if existing COA rules prohibit it |

Suggested validation messages:

```text
Description is required.
```

```text
Default Account description already exists for this type.
```

```text
Cannot create default account. Required Chart of Accounts parent mapping was not found.
```

```text
Cannot update default account. One or more generated Chart of Accounts records are already used.
```

---

## 9. Recommended Backend Flow

### Create Flow

1. Validate type and description.
2. Check duplicate description for the same company and type.
3. Begin database transaction.
4. Resolve required company default account mappings for the selected type.
5. For each required generated account:
   - Recalculate the next account code under the resolved parent.
   - Create a `SPECIFIC` Chart of Accounts posting account.
6. Create the Default Account Template record with links to generated COA IDs.
7. Commit transaction.
8. Return the created Default Account with linked COA details.

### Edit Flow

1. Validate the Default Account Template exists.
2. Validate description and duplicate rules.
3. Begin database transaction.
4. Update Default Account fields.
5. Update generated COA titles based on the new description.
6. Commit transaction.
7. Return the updated Default Account with linked COA details.

### Delete or Inactivate Flow

1. Validate the Default Account Template exists.
2. Load all linked generated COA accounts.
3. Check transaction usage and COA dependency rules.
4. Begin database transaction.
5. Soft delete or inactivate the Default Account.
6. Soft delete or inactivate linked COA accounts when allowed.
7. Commit transaction.

---

## 10. API Endpoints

Use the same controller/service/repository architecture and route style as Bank Masterfile.

Recommended endpoints:

```text
GET    /api/v1/maintenance/default-accounts
GET    /api/v1/maintenance/default-accounts/:id
POST   /api/v1/maintenance/default-accounts
PATCH  /api/v1/maintenance/default-accounts/:id
DELETE /api/v1/maintenance/default-accounts/:id
PATCH  /api/v1/maintenance/default-accounts/:id/status
```

Recommended create request:

```ts
type CreateDefaultAccountRequest = {
  type: 'EXPENSE' | 'COLLECTION' | 'FIXED_ASSET';
  description: string;
  status?: 'ACTIVE' | 'INACTIVE';
};
```

Recommended response shape:

```ts
type DefaultAccountResponse = {
  id: string;
  type: 'EXPENSE' | 'COLLECTION' | 'FIXED_ASSET';
  description: string;
  status: 'ACTIVE' | 'INACTIVE';
  generatedAccounts: Array<{
    role: 'EXPENSE' | 'REVENUE' | 'FIXED_ASSET' | 'ACCUMULATED_DEPRECIATION' | 'DEPRECIATION_EXPENSE';
    chartAccountId: string;
    accountCode: string;
    accountTitle: string;
  }>;
  dateCreated: string;
  dateModified?: string;
};
```

---

## 11. Suggested UI Fields

### Default Account Information

- Type
- Description
- Status

### Generated Chart of Accounts

- Account Role
- Account Code
- Account Title
- Parent Account
- Status

The UI should match the Bank Masterfile page structure:

- List page under Maintenance.
- Add/edit dialog or form using shared form components.
- Search input and action buttons using the same visual pattern.
- Delete/inactivate confirmation using the existing confirmation component.
- Validation messages displayed through the existing form and toast/error handling.

Recommended frontend route:

```text
gr8bookslite-frontend/app/(modules)/maintenance/default-account/page.tsx
```

Recommended component folder:

```text
gr8bookslite-frontend/app/src/ui/modules/maintenance/default-account
```

---

## 12. Permissions

Use the same permission catalog pattern as Bank Masterfile.

| Action | Permission |
|---|---|
| View Default Account | Default Account - View |
| Create Default Account | Default Account - Create |
| Edit Default Account | Default Account - Edit |
| Delete/Inactivate Default Account | Default Account - Delete |

---

## 13. Transaction Module Usage

Transaction modules may use Default Account Templates as selectable templates for resolving posting accounts.

Default Account Templates should not create transaction records automatically. They should provide generated Chart of Accounts links that transaction modules can use according to each module's own accounting setup.

### 13.1 Account Resolution

The transaction module decides whether a resolved account is used as a debit account, credit account, or part of a multi-line accounting entry.

Recommended generated account usage:

| Template type | Generated account normally used for |
|---|---|
| `EXPENSE` | Expense debit lines, expense reversals, or configured transaction lines |
| `COLLECTION` | Revenue credit lines, revenue reversals, or configured transaction lines |
| `FIXED_ASSET` | Asset debit lines, accumulated depreciation credit lines, depreciation expense debit lines |

For modules with different account setup rules, use the module-specific account setup first. Default Account Template should be a helper source, not the only source of truth.

Recommended setup priority:

1. Module-specific account setup, if selected or required.
2. Default Account Template generated COA, if the transaction line is tied to a template.
3. Manual COA selection, only if allowed by permissions.
4. Backend validation error if no valid account can be resolved.

### 13.2 Recommended Backend Flow

1. Transaction request includes an optional `default_account_template_id`.
2. Backend loads the template by `company_id`, `id`, `status = ACTIVE`, and not deleted.
3. Backend validates that the selected template type is allowed for the transaction context.
4. Backend resolves the required COA account or accounts from the template:
   - `EXPENSE` can use `expense_coa_id`.
   - `COLLECTION` can use `revenue_coa_id`.
   - `FIXED_ASSET` can use `asset_coa_id`, `accumulated_depreciation_coa_id`, or `expense_coa_id` depending on the transaction context.
5. Backend validates that every resolved COA account is active, posting, and belongs to the same company.
6. Backend saves both the selected template ID, when used, and the final resolved COA IDs.
7. Posting uses resolved COA IDs, not template descriptions.

### 13.3 Recommended Data Link

If a transaction stores detail lines, add optional links from the line to the selected template and final COA accounts:

| Field | Data Type | Required | Description |
|---|---:|---:|---|
| `default_account_template_id` | bigint | No | Selected Default Account Template |
| `debit_chart_account_id` | bigint | Depends on transaction | Final debit COA used for posting |
| `credit_chart_account_id` | bigint | Depends on transaction | Final credit COA used for posting |

Transaction lines must keep resolved COA IDs even if the template is later renamed or inactivated. This preserves accounting history.

### 13.4 Validation Messages

Suggested messages:

```text
Selected default account is inactive or no longer available.
```

```text
Selected default account is not allowed for this transaction.
```

```text
Selected default account does not have a valid Chart of Accounts record.
```

---

## 14. Important Rules

- Backend owns all account code generation.
- Frontend must never generate Chart of Accounts codes.
- Use internal COA IDs for links, not `AccountCode`.
- Do not create parent/group accounts dynamically from this module.
- Do not rely on account titles as permanent identifiers.
- Use `company_default_accounts` mappings first, with title matching only as a legacy fallback.
- Create all generated COA accounts and the Default Account Template record in the same transaction.
- Roll back the whole operation if any required generated COA account fails.
- Keep behavior compatible with existing Chart of Accounts restrictions for used accounts.
- Keep platform mapping records in `default_accounts`; keep user maintenance records in `default_account_templates`.

---

## 15. Implementation Notes

- Reuse the Chart of Accounts service method that Bank Masterfile uses for child account creation and next-code generation.
- Add a shared helper if Bank Masterfile currently has private logic that should also support this module.
- Add tests for each type:
  - Expense Type creates one expense COA.
  - Collection Type creates one revenue COA.
  - Fixed Asset Type creates asset, accumulated depreciation, and depreciation expense COA accounts.
  - Duplicate descriptions are blocked.
  - Missing parent mappings roll back the create request.
  - Edit updates linked COA titles.
  - Partial COA creation failure rolls back all records.
  - Transaction modules can resolve active templates into final COA IDs.
  - Transaction modules reject inactive templates.
  - Transaction modules reject template types that are not allowed by the transaction context.
