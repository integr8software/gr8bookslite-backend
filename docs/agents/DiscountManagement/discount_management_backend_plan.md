# Discount Management Backend Plan

## Purpose

Discount Management is currently a frontend-backed mock module. The next implementation should make it a company-scoped backend module connected to the company Chart of Accounts.

The default discount records should be provisioned for every new company the same way default Chart of Accounts and Terms are provisioned. Because each discount points to an account title, the default COA template must also include or generate the corresponding discount accounts during company creation.

## Current Frontend Behavior

Current source files:

```text
gr8bookslite-frontend/app/src/data/modules/maintenance/financial-management/discount-management/DiscountManagementData.ts
gr8bookslite-frontend/app/src/hooks/modules/maintenance/discount-management/useDiscountManagement.ts
gr8bookslite-frontend/app/src/ui/modules/maintenance/discount-management/
```

Right now `useDiscountManagementStore` uses `MockDiscounts` through TanStack Query local cache. There is no backend API yet.

Current fields:

| Field | Meaning |
|---|---|
| `name` | Discount name shown in the table and form |
| `description` | User-facing explanation |
| `type` | `Sales` or `Purchase` |
| `discountType` | `Percentage` or `Fixed` |
| `amount` | Numeric value, for example `5` for 5 percent or `100` for fixed amount |
| `accountCode` | Generated mock code such as `SD-PROMPT-PAYMENT` |
| `accountTitle` | Connected COA account title |
| `accountGroupPath` | Display helper: `Sales > Sales Discount` or `Cost of Sales > Purchase Discount` |
| `status` | `Active` or `Inactive` |

Current behavior:

1. List page loads `MockDiscounts`.
2. Statistics are computed in frontend state:
   - Total
   - Active
   - Inactive
   - Purchases
   - Sales
   - Percentage Type
3. Add/edit/view happens in a drawer.
4. For normal new records, the frontend generates account title from type and name:
   - Sales: `Sales Discount - [name]`
   - Purchase: `Purchase Discount - [name]`
5. The current mock seed can override `accountTitle` for nicer default titles, for example:
   - Discount name: `Trade Discount`
   - Account title: `Sales Discount - Trade`
6. Import exists in the frontend and imports into local mock cache only.

## Current Default Mock Data

These records should become the backend default company seed.

| Discount Name | Type | Value Type | Sample Value | Account Title |
|---|---|---:|---:|---|
| Prompt Payment | Sales | Percentage | 5% | Sales Discount - Prompt Payment |
| Trade Discount | Sales | Percentage | 7.5% | Sales Discount - Trade |
| Volume Sales Discount | Sales | Percentage | 10% | Sales Discount - Volume Sales |
| Senior Citizen Discount | Sales | Percentage | 20% | Sales Discount - Senior Citizen |
| PWD Discount | Sales | Percentage | 20% | Sales Discount - PWD |
| Promotional Discount | Sales | Percentage | 10% | Sales Discount - Promotional |
| Loyalty Discount | Sales | Percentage | 5% | Sales Discount - Loyalty |
| Employee Discount | Sales | Percentage | 10% | Sales Discount - Employee |
| Special Approval Discount | Sales | Percentage | 15% | Sales Discount - Special Approval |
| Fixed Sales Discount | Sales | Fixed | 100.00 | Sales Discount - Fixed Amount |
| Supplier Early Payment | Purchase | Percentage | 2% | Purchase Discount - Supplier Early Payment |
| Volume Purchase Discount | Purchase | Fixed | 100.00 | Purchase Discount - Volume Purchase |
| Supplier Trade Discount | Purchase | Percentage | 5% | Purchase Discount - Supplier Trade |
| Purchase Rebate | Purchase | Percentage | 3% | Purchase Discount - Rebate |
| Bulk Purchase Discount | Purchase | Percentage | 10% | Purchase Discount - Bulk Purchase |

All default records should seed as active.

## COA Relationship

Discount Management must not store only a free-text account title. It should point to a company `chart_accounts` row.

Required hierarchy:

```text
Sales
  Sales Discount
    Sales Discount - Prompt Payment
    Sales Discount - Trade
    Sales Discount - Volume Sales
    Sales Discount - Senior Citizen
    Sales Discount - PWD
    Sales Discount - Promotional
    Sales Discount - Loyalty
    Sales Discount - Employee
    Sales Discount - Special Approval
    Sales Discount - Fixed Amount

Cost of Sales
  Purchase Discount
    Purchase Discount - Supplier Early Payment
    Purchase Discount - Volume Purchase
    Purchase Discount - Supplier Trade
    Purchase Discount - Rebate
    Purchase Discount - Bulk Purchase
```

Recommended accounting treatment:

| Discount type | COA area | Account nature | Posting |
|---|---|---|---|
| Sales | Sales > Sales Discount | Debit or contra-revenue behavior, depending on current COA conventions | Specific posting account |
| Purchase | Cost of Sales > Purchase Discount | Credit or contra-cost behavior, depending on current COA conventions | Specific posting account |

Use the existing COA enum values. If the current standard COA treats Sales as `REVENUE` and Cost of Sales as `EXPENSE`, the discount child accounts should match the parent account type/group already used in the seeded COA.

## Backend Target Behavior

When backend exists, the frontend should stop reading `MockDiscounts` and use an API service like Term Management.

Recommended endpoint base:

```text
/maintenance/financial-management/discounts
```

Recommended operations:

| Operation | Method/path | Notes |
|---|---|---|
| List | `GET /maintenance/financial-management/discounts` | Supports search, type, value type, status, pagination, sorting |
| Get one | `GET /maintenance/financial-management/discounts/:id` | Company-scoped |
| Create | `POST /maintenance/financial-management/discounts` | Creates or links a COA account |
| Update | `PATCH /maintenance/financial-management/discounts/:id` | May update linked COA title if name/type/title changes |
| Import | `POST /maintenance/financial-management/discounts/import` | Same behavior as Terms import |
| Status | Either `PATCH` with status or dedicated status endpoint | Keep consistent with Terms |

Recommended response shape:

```ts
type DiscountManagement = {
  id: string;
  name: string;
  description: string;
  type: "SALES" | "PURCHASE";
  valueType: "PERCENTAGE" | "FIXED";
  value: string;
  status: "ACTIVE" | "INACTIVE";
  chartAccountId: string;
  accountCode: string;
  accountTitle: string;
  createdBy: string | null;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string;
};
```

Frontend mappers can display backend enums as:

| Backend | Frontend |
|---|---|
| `SALES` | `Sales` |
| `PURCHASE` | `Purchase` |
| `PERCENTAGE` | `Percentage` |
| `FIXED` | `Fixed` |
| `ACTIVE` | `Active` |
| `INACTIVE` | `Inactive` |

## Recommended Prisma Additions

Add a company-scoped table for discounts.

```prisma
model Discount {
  id              BigInt         @id @default(autoincrement())
  companyId       Int            @map("company_id")
  chartAccountId  BigInt         @map("chart_account_id")
  name            String         @db.VarChar(150)
  description     String?        @db.VarChar(500)
  type            DiscountType
  valueType       DiscountValueType @map("value_type")
  value           Decimal        @db.Decimal(18, 4)
  status          DiscountStatus @default(ACTIVE)
  createdByUserId Int?           @map("created_by_user_id")
  updatedByUserId Int?           @map("updated_by_user_id")
  deletedAt       DateTime?      @map("deleted_at")
  createdAt       DateTime       @default(now()) @map("created_at")
  updatedAt       DateTime       @updatedAt @map("updated_at")

  company         Company        @relation(fields: [companyId], references: [id], onDelete: Cascade)
  chartAccount    ChartAccount   @relation(fields: [chartAccountId], references: [id], onDelete: Restrict)

  @@unique([companyId, name], map: "discounts_company_name_key")
  @@unique([companyId, chartAccountId], map: "discounts_company_chart_account_key")
  @@index([companyId, status], map: "discounts_company_status_idx")
  @@index([companyId, type], map: "discounts_company_type_idx")
  @@map("discounts")
}

enum DiscountType {
  SALES
  PURCHASE
}

enum DiscountValueType {
  PERCENTAGE
  FIXED
}

enum DiscountStatus {
  ACTIVE
  INACTIVE
}
```

If the backend prefers to reuse `ChartAccountStatus` for status, keep it consistent with Terms and Bank Masterfile. A dedicated `DiscountStatus` is cleaner if the module may later have discount-specific states.

## Default Seed Data

Create a backend helper similar to Terms:

```text
src/modules/maintenance/discounts/default-discounts.ts
```

Recommended exports:

```ts
export const DefaultCompanyDiscounts = [
  {
    name: "Prompt Payment",
    description: "Encourages customers to pay invoices before the due date.",
    type: DiscountType.SALES,
    valueType: DiscountValueType.PERCENTAGE,
    value: "5",
    accountTitle: "Sales Discount - Prompt Payment",
  },
  // ...remaining rows
] as const;

export async function seedDefaultDiscountsForCompany(tx, companyId: number) {
  // Skip if company already has non-deleted discounts.
  // Resolve chart accounts by accountTitle + companyId.
  // Create missing COA accounts only if the default COA copy did not include them.
  // Create discount rows linked to chartAccountId.
}
```

Seed rule:

1. If the company already has any active or inactive discount rows, do not reseed.
2. Resolve the target account by `companyId + accountTitle`.
3. If missing, create the specific account under the correct parent:
   - Sales type: parent `Sales Discount`
   - Purchase type: parent `Purchase Discount`
4. Create the `discounts` row linked to the resolved/created `chartAccountId`.
5. Use `createdByUserId: null` for system defaults, same as Terms.

## Default COA Template Update

Because company creation copies `default_chart_accounts` into `chart_accounts`, update the default COA template before seeding discounts.

Minimum requirements:

1. Ensure there is an active `Sales Discount` parent/group under Sales.
2. Ensure there is an active `Purchase Discount` parent/group under Cost of Sales.
3. Add the 15 discount-specific account titles as active `SPECIFIC` posting accounts under those parents.
4. Keep the account titles exactly aligned with `DefaultCompanyDiscounts.accountTitle`.
5. Keep account codes compatible with the existing COA numbering rules and `account_code` length.

Recommended `default_accounts` anchors:

| Module code | Account role | Points to | Usage |
|---|---|---|---|
| `DM` | `SALES_DISCOUNT_PARENT` | `Sales Discount` parent/group | `SELECTION_GROUP` |
| `DM` | `PURCHASE_DISCOUNT_PARENT` | `Purchase Discount` parent/group | `SELECTION_GROUP` |

These anchors let `seedDefaultDiscountsForCompany` find the parent accounts without fuzzy title matching after the company COA copy has run.

## Company Provisioning Flow

Current onboarding company detail save flow calls:

```ts
await seedCompanyTermManagementDefaults(this.prisma, provisionedCompany.id);
await seedDefaultChartAccountsForCompany(this.prisma, provisionedCompany.id);
await seedDefaultBankAccountsForCompany(this.prisma, provisionedCompany.id);
```

Target flow:

```ts
await seedCompanyTermManagementDefaults(this.prisma, provisionedCompany.id);
await seedDefaultChartAccountsForCompany(this.prisma, provisionedCompany.id);
await seedDefaultDiscountsForCompany(this.prisma, provisionedCompany.id);
await seedDefaultBankAccountsForCompany(this.prisma, provisionedCompany.id);
```

Discounts should seed after COA because they need company `chart_accounts` IDs.

If there is a workspace company creation path outside onboarding, call the same helper there too.

## Create/Edit Rules

Create flow:

1. Validate company access and `DM:CREATE`.
2. Validate unique discount name per company.
3. Validate value:
   - Percentage must be `0` to `100`.
   - Fixed must be `>= 0`.
4. Resolve parent account from `company_default_accounts`:
   - `DM:SALES_DISCOUNT_PARENT` for Sales
   - `DM:PURCHASE_DISCOUNT_PARENT` for Purchase
5. Create a specific posting COA account under that parent if account title does not exist.
6. Create the discount row linked to that COA account.

Update flow:

1. Validate company access and `DM:UPDATE`.
2. If name or type changes, determine the next account title.
3. Prefer updating the linked COA account title if:
   - the account is a discount-created account,
   - it has no transaction usage yet,
   - and no sibling duplicate exists.
4. If the COA account cannot be renamed safely, either block the change or create/link a new account. Pick one rule and keep it consistent.

Deactivate flow:

1. Deactivating a discount should set `discounts.status = INACTIVE`.
2. Do not automatically deactivate the linked COA account unless product decides the account must also disappear from transaction selection.
3. If a COA account is deactivated from Chart of Accounts, discount service should block use of linked inactive accounts.

## Import Rules

Use the current frontend import fields:

```text
Name, Type, Description, Discount Type, Discount Value, Status
```

Backend import should:

1. Reject duplicate names inside the upload.
2. Reject names that already exist in the company.
3. Normalize `Sales`, `Sale` to `SALES`.
4. Normalize `Purchase`, `Purchases` to `PURCHASE`.
5. Normalize `Percentage`, `Percent`, `%` to `PERCENTAGE`.
6. Normalize `Fixed`, `Amount`, `Flat` to `FIXED`.
7. For each row, create or resolve the COA account first, then create the discount.
8. Run the whole import in a transaction if possible. If batching is needed, fail per batch and return useful error messages.

## Permissions

Use a new permission/module code:

```text
DM
```

Recommended permission checks:

| Action | Permission |
|---|---|
| View/list | `DM:VIEW` |
| Create/import | `DM:CREATE` |
| Update/status | `DM:UPDATE` |
| Export | `DM:EXPORT` |

Reserved roles should behave like Terms:

- `SUPER_ADMIN` can access.
- Company admin or active admin membership can access all actions.
- Non-admin users need explicit permission codes.

## Frontend Switch After Backend

Replace the mock store in:

```text
gr8bookslite-frontend/app/src/hooks/modules/maintenance/discount-management/useDiscountManagement.ts
```

with a service pattern like:

```text
gr8bookslite-frontend/app/src/services/modules/maintenance/discount-management/DiscountManagementApi.ts
gr8bookslite-frontend/app/src/services/modules/maintenance/discount-management/DiscountManagementQueryKeys.ts
```

Match Term Management's service/hook pattern:

- `fetchDiscounts`
- `createDiscount`
- `updateDiscount`
- `importDiscounts`
- permission/statistics response from backend

Frontend should no longer generate account codes/titles once backend is live. The backend should return:

- `accountCode`
- `accountTitle`
- `chartAccountId`

The form may still preview a proposed account title, but backend is the source of truth.

## Database Rebuild Notes

For the current implementation pass, rebuilding the local database is acceptable because Discount Management needs new tables and the default COA template should be updated.

Recommended order:

1. Add Prisma models/enums for discounts.
2. Add migration.
3. Update `standardDefaultCoaTemplate` or default COA seed source to include the discount parent/group and the 15 discount posting accounts.
4. Add `default_accounts` mappings for `DM:SALES_DISCOUNT_PARENT` and `DM:PURCHASE_DISCOUNT_PARENT`.
5. Add `seedDefaultDiscountsForCompany`.
6. Call it in onboarding/company creation after COA copy.
7. Rebuild/reset local database.
8. Run seed.
9. Create a new company and verify:
   - Terms are seeded.
   - COA is seeded.
   - Discount COA accounts exist.
   - Discount rows exist and link to the COA accounts.
   - Bank defaults still seed successfully.

## Verification Checklist

After backend implementation:

1. `GET /maintenance/financial-management/discounts` returns the 15 default records for a new company.
2. Every discount has a valid `chartAccountId`.
3. Every linked chart account exists under the correct parent.
4. Account titles match the default table exactly.
5. Statistics match:
   - Total: 15
   - Active: 15
   - Inactive: 0
   - Purchases: 5
   - Sales: 10
   - Percentage Type: 13
6. Creating a Sales discount creates/links a child under Sales Discount.
7. Creating a Purchase discount creates/links a child under Purchase Discount.
8. Duplicate names are rejected.
9. Duplicate account titles under the same parent are rejected or reused according to the chosen rule.
10. Frontend no longer depends on `MockDiscounts` after service integration.
