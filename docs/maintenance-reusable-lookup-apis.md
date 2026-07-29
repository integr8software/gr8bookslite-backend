# Maintenance Reusable Lookup APIs

This document defines how other backend modules should read Maintenance masterfile data for forms, dropdowns, selectors, and document preparation without exposing full maintenance records or sensitive columns.

The API base path is:

```text
/api/v1
```

All routes require a valid JWT and an active company selected on the authenticated user. Reusable lookup routes require company access only unless this document explicitly says a module permission is required.

## Policy

Use full Maintenance list/detail APIs only for Maintenance screens.

Full APIs must require the module `VIEW` permission because they may include full records, statistics, audit names, permissions, addresses, accounting mappings, tax data, bank details, or other data that is not needed by ordinary forms.

Use lookup or options APIs when another module only needs records to populate a field.

Lookup APIs should:

- Return active, non-deleted records by default.
- Return only the fields needed to identify and select a record.
- Verify the user belongs to the active company.
- Never return audit fields, permission flags, statistics, private identifiers, full addresses, TIN/tax defaults, bank account numbers, or full accounting mappings unless the consuming workflow truly needs them and has its own authorization rule.

Recommended generic option shape:

```ts
type LookupOption = {
  id: string;
  code?: string | null;
  name: string;
  label?: string;
  status?: string;
};
```

## Available Reusable Routes

These routes already exist and are intended or commonly used as reusable data sources.

| Data | Route | Parameters | Authz | Response |
| --- | --- | --- | --- | --- |
| Party names by type | `GET /api/v1/maintenance/party-maintenance/options/:partyType` | `partyType`: `CUSTOMER`, `VENDOR`, `EMPLOYEE`, `MEMBER`, or another valid `PartyType` enum value | Authenticated active company | `{ parties }` |
| Item categories | `GET /api/v1/maintenance/item-category/options` | None | Authenticated active company | `{ categories }` |
| Item variations and values | `GET /api/v1/maintenance/item-variations/options` | None | Authenticated active company | `{ variations }` |
| Form signatory branches/modules | `GET /api/v1/maintenance/form-signatories/options` | None | Authenticated active company | `{ branches, modules }` |
| Form signatory bootstrap | `GET /api/v1/maintenance/form-signatories/bootstrap` | None | Authenticated active company | `{ branches, modules, setups }` |
| Resolve form signatory | `GET /api/v1/maintenance/form-signatories/resolve` | `unitId`: number, `moduleCodes`: comma-separated module codes | Authenticated active company | `{ setup }` |
| Default account expense parent options | `GET /api/v1/maintenance/default-account/expense-parent-options` | None | Authenticated active company; currently allowed through `VIEW` | `{ options }` |
| Service accounting account options | `GET /api/v1/maintenance/services-maintenance/account-options` | None | Requires Services Maintenance `VIEW` | Account option groups |
| Party accounting account options | `GET /api/v1/maintenance/party-maintenance/accounting-options` | None | Requires Party Maintenance `VIEW` | Account option groups |

## Response Fields

### Party Options

Route:

```text
GET /api/v1/maintenance/party-maintenance/options/:partyType
```

Returns active parties for the selected company and party type.

```ts
{
  parties: Array<{
    id: string;
    partyCodeNo: string;
    classification: string;
    partyTypes: string[];
    name: string;
    contactPerson: string;
    email: string;
    contactNo: string;
    status: string;
  }>;
}
```

Use this for customer/vendor/employee/member dropdowns. Do not use `GET /maintenance/party-maintenance` for dropdowns because the full route requires `PM:VIEW` and includes broader party information.

Sensitive fields that should not be added to this lookup response: TIN, ATC code, tax defaults, addresses, receivable/payable account IDs, audit fields, statistics, and permission flags.

### Item Category Options

Route:

```text
GET /api/v1/maintenance/item-category/options
```

Returns active item categories.

```ts
{
  categories: Array<{
    id: string;
    code: string;
    name: string;
    description: string;
    parentId: string | null;
    behaviors: string[];
    allowSubCategory: boolean;
    status: string;
  }>;
}
```

Use this for item creation, inventory, purchasing, and sales forms that need category selection.

Sensitive fields that should not be added: inventory account, sales account, cost of sales account, expense account, inherited accounting source, audit fields, statistics, and permission flags.

### Item Variation Options

Route:

```text
GET /api/v1/maintenance/item-variations/options
```

Returns active item variations with active values.

```ts
{
  variations: Array<{
    id: string;
    code: string;
    name: string;
    usage: string;
    requiredOnItem: boolean;
    affectsStock: boolean;
    status: string;
    values: Array<{
      id: string;
      label: string;
      isUsed: boolean;
      status: string;
    }>;
  }>;
}
```

Use this for item forms where variation/value selection is needed.

### Form Signatory Options

Route:

```text
GET /api/v1/maintenance/form-signatories/options
```

Returns active company units and entitled modules that can be used to configure signatories.

```ts
{
  branches: Array<{
    id: number;
    companyId: number;
    code: string | null;
    name: string;
    displayName: string | null;
    type: string;
  }>;
  modules: Array<{
    id: number;
    code: string;
    name: string;
  }>;
}
```

### Resolve Form Signatory

Route:

```text
GET /api/v1/maintenance/form-signatories/resolve?unitId=1&moduleCodes=SI,SO
```

Returns the best matching signatory setup for a company unit and one or more module codes.

```ts
{
  setup: {
    id: number;
    companyId: number;
    unit: { id: number; companyId: number; code: string | null; name: string; displayName: string | null; type: string };
    module: { id: number; code: string; name: string };
    rows: Array<{
      id: number;
      label: string;
      name: string;
      position: string | null;
      signatureName: string | null;
      signatureImage: string | null;
      signatureValidUntil: string | null;
      isThisTemporary: boolean | null;
    }>;
    createdAt: string;
    updatedAt: string;
  } | null;
}
```

Use this when printing or preparing documents that need signatory names. Be careful with signature images; if an image is not required by the caller, prefer adding a narrower route that returns only label, name, and position.

### Default Account Expense Parent Options

Route:

```text
GET /api/v1/maintenance/default-account/expense-parent-options
```

Returns active expense parent accounts that can be selected when creating Expense default accounts.

```ts
{
  options: Array<{
    id: string;
    accountCode: string;
    accountTitle: string;
    accountLevel: string;
    parentAccountId: string | null;
  }>;
}
```

Use this only for default-account setup workflows. For ordinary transaction forms, add a narrower endpoint in the consuming module if account selection needs to be restricted by workflow.

## Recommended Routes To Add

The modules below currently have full list/detail routes, but should also expose lookup routes for cross-module form use.

| Data | Recommended route | Parameters | Authz | Recommended response |
| --- | --- | --- | --- | --- |
| Terms | `GET /api/v1/maintenance/terms-maintenance/options` | Optional `search`, optional `dateMode` | Authenticated active company | `{ terms: [{ id, name, dateMode, period, status }] }` |
| Unit of measurement | `GET /api/v1/maintenance/unit-of-measurement/options` | Optional `search`, optional `quantityMode` | Authenticated active company | `{ units: [{ id, name, symbol, quantityMode, status }] }` |
| Payment types | `GET /api/v1/maintenance/payment-type-maintenance/options` | Optional `classification` | Authenticated active company | `{ paymentTypes: [{ id, name, classification, sortOrder, status }] }` |
| Discounts | `GET /api/v1/maintenance/discount-maintenance/options` | Optional `type`, optional `valueType` | Authenticated active company | `{ discounts: [{ id, name, type, valueType, value, status }] }` |
| Warehouses | `GET /api/v1/maintenance/warehouse-maintenance/options` | Optional `branchUnitId` | Authenticated active company | `{ warehouses: [{ id, code, name, status }] }` |
| Bank accounts | `GET /api/v1/maintenance/bank-masterfile/options` | Optional `currencyCode` | Usually requires `BM:VIEW`; company-only only if bank details are masked/minimal | `{ banks: [{ id, bankName, accountName, maskedAccountNumber, currencyCode, status }] }` |
| Chart accounts | `GET /api/v1/maintenance/chart-of-accounts/options` | Optional `accountType`, `accountNature`, `postingOnly`, `parentAccountId` | Usually requires module/workflow permission | `{ accounts: [{ id, accountCode, accountTitle, accountType, accountNature, status }] }` |
| Responsibility centers | `GET /api/v1/maintenance/responsibility-center/options` | Optional `classificationId`, optional `typeId` | Authenticated active company, or `RC:VIEW` for richer hierarchy data | `{ responsibilityCenters: [{ id, code, name, typeName, status }] }` |
| Services | `GET /api/v1/maintenance/services-maintenance/options` | Optional `search` | Authenticated active company | `{ services: [{ id, serviceName, status }] }` |

## Full APIs Are Not Lookup APIs

Do not use these full routes for ordinary dropdowns unless the caller is a Maintenance screen and the user has the matching `VIEW` permission:

```text
GET /api/v1/maintenance/party-maintenance
GET /api/v1/maintenance/terms-maintenance
GET /api/v1/maintenance/unit-of-measurement
GET /api/v1/maintenance/payment-type-maintenance
GET /api/v1/maintenance/discount-maintenance
GET /api/v1/maintenance/bank-masterfile
GET /api/v1/maintenance/warehouse-maintenance
GET /api/v1/maintenance/chart-of-accounts
GET /api/v1/maintenance/default-account
GET /api/v1/maintenance/services-maintenance
GET /api/v1/maintenance/responsibility-center
GET /api/v1/maintenance/item-category
GET /api/v1/maintenance/item-variations
```

## Implementation Checklist

When adding a new reusable Maintenance lookup route:

1. Add the route as `GET /options` unless a path parameter is needed, such as `options/:partyType`.
2. Use `JwtAuthGuard` and `@CurrentUser()`.
3. Resolve `companyId` from `user.companyId`; never accept company ID from the client for these routes.
4. Call `ensureCompanyAccess(user, companyId)`.
5. Filter to `status: ACTIVE` and `deletedAt: null` unless the workflow explicitly needs inactive choices.
6. Use Prisma `select` instead of `include` for minimal columns.
7. Return a dedicated option DTO or mapper, separate from the full maintenance response mapper.
8. Add a test that a user with active company membership but without module `VIEW` can use the lookup route.
9. Add a test that removed/inactive company membership cannot use the lookup route.
10. Add a test that sensitive fields are not present in the response.

## Naming Convention

Use these names consistently:

- `findAll`: full maintenance list, requires module `VIEW`.
- `findOne`: full maintenance detail, requires module `VIEW`.
- `findOptions`: reusable minimal lookup, company access only unless sensitive.
- `findBootstrap`: page bootstrap payload, only when one screen needs multiple option groups at once.
- `resolve`: lookup a workflow-specific setup using IDs or module codes.

This keeps permission behavior readable: full maintenance data is protected by module permission; cross-module form data is available through intentional, minimal, reusable lookup APIs.
