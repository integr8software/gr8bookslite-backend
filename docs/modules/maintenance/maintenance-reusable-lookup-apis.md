# Maintenance Reusable Lookup APIs

This document defines how other backend modules should read Maintenance masterfile data for forms, dropdowns, selectors, and document preparation without exposing full maintenance records or sensitive columns.

The API base path is:

```text
/api/v1
```

All routes require a valid JWT and an active company selected on the authenticated user. Reusable lookup routes require company access only unless this document explicitly says a module or workflow permission is required.

## Recommended Project Setup

Maintenance masterfile modules should own the reusable lookup logic, but not every consuming workflow should be forced to use the same shared Maintenance API endpoint.

Use this split:

```text
Maintenance module
  Owns master data, validation, lifecycle, and reusable lookup services.

Maintenance shared authenticated options API
  Exposes harmless, generic dropdowns used by many screens.

Transaction module
  Owns workflow-specific lookup APIs, permissions, filters, response shape, and save-time validation.
```

The preferred backend structure is:

```text
maintenance/
  terms-maintenance/
    terms-maintenance.controller.ts       // full CRUD + optional generic /options
    terms-maintenance.service.ts          // full maintenance behavior
    lookups/
      terms-lookup.service.ts             // reusable lookup query logic

purchasing/
  purchase-order/
    purchase-order.controller.ts
    purchase-order.service.ts
    lookups/
      purchase-order-reference-lookup.controller.ts
      purchase-order-reference-lookup.service.ts
```

The shared authenticated Maintenance options route should be thin:

```ts
@Get('options')
findOptions(@CurrentUser() user: AuthUser, @Query() query: TermLookupQueryDto) {
  return this.termsLookupService.findOptionsForCompanyUser(user, query);
}
```

A transaction lookup can reuse the same lookup service and add its own authorization, filters, or fields:

```ts
@Get('lookups/terms')
@RequireAnyPermission('PURCHASE_ORDER:VIEW', 'PURCHASE_ORDER:CREATE', 'PURCHASE_ORDER:UPDATE')
findTerms(@CurrentUser() user: AuthUser, @Query() query: TermLookupQueryDto) {
  return this.purchaseOrderReferenceLookupService.findTerms(user, query);
}
```

Internally:

```text
PurchaseOrderReferenceLookupController
  -> PurchaseOrderReferenceLookupService
  -> TermsLookupService
```

This keeps shared query rules in one place while allowing each workflow to own its external API contract.

## Policy

Use full Maintenance list/detail APIs only for Maintenance screens.

Full APIs must require the module `VIEW` permission because they may include full records, statistics, audit names, permissions, addresses, accounting mappings, tax data, bank details, or other data that is not needed by ordinary forms.

Use lookup or options APIs when another module only needs records to populate a field. Prefer using the Maintenance lookup service internally when multiple modules need the same base logic.

Lookup APIs should:

- Return active, non-deleted records by default.
- Return only the fields needed to identify and select a record.
- Verify the user belongs to the active company.
- Reuse a dedicated lookup service instead of copying Prisma queries into multiple transaction modules.
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

## Authenticated API Versus Shared Service

Do not treat shared authenticated Maintenance `/options` endpoints as the only reusable mechanism.

There are three reusable surfaces:

| Surface | Intended use | Authorization owner | Response owner |
| --- | --- | --- | --- |
| Maintenance shared authenticated `/options` API | Generic, harmless dropdowns used by many modules | Maintenance lookup policy, usually active company access | Maintenance module |
| Maintenance lookup service | Shared backend query logic reused by transaction modules | Caller or wrapper service | Calling workflow or service |
| Transaction lookup API | Workflow-specific selection lists | Transaction module | Transaction module |

Example:

```text
GET /api/v1/maintenance/terms-maintenance/options
```

Good for a generic term dropdown.

```text
GET /api/v1/purchasing/purchase-orders/lookups/terms
```

Better when Purchase Order needs PO permissions, branch rules, supplier defaults, or extra fields.

The transaction endpoint may call the same `TermsLookupService`, but it should not leak the full Maintenance DTO or require Terms Maintenance `VIEW`.

## When To Add A Shared Maintenance Options Route

Add or keep a shared authenticated Maintenance `/options` route when:

- The response is minimal and harmless.
- Many modules need the same fields and filters.
- Company access is enough authorization.
- The route does not need workflow-specific eligibility.
- The route does not expose sensitive columns.

Good examples:

- Terms: `{ id, name, dateMode, period, status }`
- Unit of measurement: `{ id, name, symbol, quantityMode, status }`
- Payment type: `{ id, name, classification, sortOrder, status }`
- Item category names and behavior flags without accounting mappings

## When To Use Transaction-Owned Lookups

Create lookup APIs inside the consuming transaction module when:

- The lookup requires transaction permissions.
- The available records depend on branch, warehouse, responsibility center, user assignment, supplier/customer, document type, or business process.
- The client needs extra workflow fields.
- The lookup includes sensitive or semi-sensitive data.
- Different workflows need different filters for the same masterfile.

Examples:

```text
GET /api/v1/purchasing/purchase-orders/lookups/suppliers
GET /api/v1/purchasing/purchase-orders/lookups/items
GET /api/v1/purchasing/purchase-orders/lookups/items/:itemId/uoms
GET /api/v1/purchasing/purchase-orders/lookups/warehouses
GET /api/v1/sales/sales-orders/lookups/customers
GET /api/v1/sales/sales-orders/lookups/items
```

These transaction lookup endpoints should call reusable Maintenance lookup services where practical, but the transaction module owns the external response shape.

## Extending Lookup Responses

If a module needs the same base lookup plus a few extra fields, do not fork the entire query by copy-paste.

Prefer one of these patterns:

1. Add an option to the reusable lookup service, such as `includeDefaults`, `includeBranchAvailability`, or `includePricingHints`, when the extra fields are still safe and broadly meaningful.
2. Let the transaction lookup service call the reusable lookup service, then enrich the records with workflow-specific data.
3. Add a separate reusable service method for a distinct business meaning, such as `findPurchasableItems`, `findSellableItems`, or `findSelectableWarehouses`.

Avoid adding workflow-specific fields to a generic shared Maintenance `/options` response just because one screen needs them.

Example:

```ts
const terms = await this.termsLookupService.findOptions({
  companyId,
  search: query.search,
});

return {
  terms: terms.map((term) => ({
    ...term,
    isDefaultForSupplier: supplier.defaultTermId === term.id,
  })),
};
```

## Save-Time Validation

Lookup endpoints are only for user experience. Transaction create/update/submit services must still revalidate selected IDs.

When saving a transaction, recheck:

- The selected records still belong to the active company.
- The records are still active and non-deleted.
- The user still has permission for the transaction.
- Branch, warehouse, responsibility center, or other organizational scope still allows the selection.
- The selected master data is still eligible for the workflow.

Do not trust a value just because it was returned by a lookup endpoint.

## Available Reusable Routes

These routes already exist and are intended or commonly used as reusable data sources. They should be backed by reusable lookup services when multiple backend modules need the same logic.

| Data | Route | Parameters | Authz | Response |
| --- | --- | --- | --- | --- |
| Party options | `GET /api/v1/maintenance/party-maintenance/options` | `partyType`/`partyTypes`: optional `CUSTOMER`, `VENDOR`, comma-separated values, or `ALL`; `match`: `any` or `all`; `detail`: `basic` or `complete` | Authenticated active company | `{ parties }` |
| Party names by type (legacy) | `GET /api/v1/maintenance/party-maintenance/options/:partyType` | `partyType`: `CUSTOMER`, `VENDOR`, `EMPLOYEE`, `MEMBER`, or another valid `PartyType` enum value | Authenticated active company | `{ parties }` |
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
GET /api/v1/maintenance/party-maintenance/options
```

Returns active parties for the selected company. Omit party filters to list all active parties.

Examples:

```text
GET /api/v1/maintenance/party-maintenance/options
GET /api/v1/maintenance/party-maintenance/options?partyType=CUSTOMER
GET /api/v1/maintenance/party-maintenance/options?partyTypes=CUSTOMER,VENDOR
GET /api/v1/maintenance/party-maintenance/options?partyTypes=CUSTOMER,VENDOR&match=all
GET /api/v1/maintenance/party-maintenance/options?partyTypes=CUSTOMER,VENDOR&detail=complete
```

Use `match=any` or omit `match` to return parties that are Customer or Vendor. Use `match=all` to return only parties that are both Customer and Vendor.

The legacy typed route still works:

```text
GET /api/v1/maintenance/party-maintenance/options/:partyType
```

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

Use this basic shape for customer/vendor/employee/member dropdowns. Do not use `GET /maintenance/party-maintenance` for dropdowns because the full route requires `PM:VIEW` and includes broader party information.

When a workflow truly needs accounting defaults, terms, addresses, and tax defaults, request:

```text
GET /api/v1/maintenance/party-maintenance/options?detail=complete
```

The complete response includes the basic fields plus address, addresses, receivable/payable account IDs and account summaries, term ID/name, TIN, ATC code, tax defaults, and landline. It still does not include audit fields, statistics, or permission flags.

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

## Recommended Shared Maintenance Options Routes

The modules below currently have full list/detail routes, but should also expose shared authenticated lookup routes only when the response is generic and safe. If the same data needs workflow-specific filtering or extra fields, create a transaction-owned lookup API that calls the reusable lookup service.

| Data | Recommended route | Parameters | Authz | Recommended response | Notes |
| --- | --- | --- | --- | --- | --- |
| Terms | `GET /api/v1/maintenance/terms-maintenance/options` | Optional `search`, optional `dateMode` | Authenticated active company | `{ terms: [{ id, name, dateMode, period, status }] }` | Keep shared; commonly reused. |
| Unit of measurement | `GET /api/v1/maintenance/unit-of-measurement/options` | Optional `search`, optional `quantityMode` | Authenticated active company | `{ units: [{ id, name, symbol, quantityMode, status }] }` | Keep shared; commonly reused. |
| Payment types | `GET /api/v1/maintenance/payment-type-maintenance/options` | Optional `classification` | Authenticated active company | `{ paymentTypes: [{ id, name, classification, sortOrder, status }] }` | Keep shared if no bank/account details are included. |
| Discounts | `GET /api/v1/maintenance/discount-maintenance/options` | Optional `type`, optional `valueType` | Authenticated active company | `{ discounts: [{ id, name, type, valueType, value, status }] }` | Shared authenticated access is acceptable for basic discount selection. Workflow pricing rules belong in transaction lookups. |
| Warehouses | `GET /api/v1/maintenance/warehouse-maintenance/options` | Optional `branchUnitId` | Authenticated active company plus branch/warehouse scope when available | `{ warehouses: [{ id, code, name, status }] }` | Use transaction-owned lookups when warehouse access differs by workflow or user assignment. |
| Bank accounts | `GET /api/v1/maintenance/bank-masterfile/options` | Optional `currencyCode` | Prefer workflow permission; company-only only if masked/minimal | `{ banks: [{ id, bankName, accountName, maskedAccountNumber, currencyCode, status }] }` | Avoid exposing full account numbers or bank setup fields. |
| Chart accounts | `GET /api/v1/maintenance/chart-of-accounts/options` | Optional `accountType`, `accountNature`, `postingOnly`, `parentAccountId` | Prefer workflow permission unless used by setup screens | `{ accounts: [{ id, accountCode, accountTitle, accountType, accountNature, status }] }` | Many account selectors should be transaction-owned because account eligibility depends on workflow. |
| Responsibility centers | `GET /api/v1/maintenance/responsibility-center/options` | Optional `classificationId`, optional `typeId` | Authenticated active company, or `RC:VIEW` for richer hierarchy data | `{ responsibilityCenters: [{ id, code, name, typeName, status }] }` | A shared authenticated basic selector is fine; hierarchy/tree data should remain permissioned. |
| Services | `GET /api/v1/maintenance/services-maintenance/options` | Optional `search` | Authenticated active company | `{ services: [{ id, serviceName, status }] }` | Use transaction-owned lookups when service price, tax, or account hints are needed. |

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

When adding a new reusable Maintenance lookup route or service:

1. Create a dedicated lookup service or lookup service method; do not put reusable lookup logic only inside the full Maintenance service.
2. Add a shared authenticated route as `GET /options` only when the lookup is generic and safe.
3. Use `JwtAuthGuard` and `@CurrentUser()` for shared authenticated routes.
4. Resolve `companyId` from `user.companyId`; never accept company ID from the client for these routes.
5. Call `ensureCompanyAccess(user, companyId)`.
6. Filter to `status: ACTIVE` and `deletedAt: null` unless the workflow explicitly needs inactive choices.
7. Use Prisma `select` instead of `include` for minimal columns.
8. Return a dedicated option DTO or mapper, separate from the full maintenance response mapper.
9. For transaction-owned lookups, enforce transaction permissions in the transaction controller or service.
10. Add a test that a user with active company membership but without module `VIEW` can use generic shared authenticated lookup routes.
11. Add a test that removed/inactive company membership cannot use the lookup route.
12. Add a test that sensitive fields are not present in the response.

## Naming Convention

Use these names consistently:

- `findAll`: full maintenance list, requires module `VIEW`.
- `findOne`: full maintenance detail, requires module `VIEW`.
- `findOptions`: reusable minimal lookup, company access only unless sensitive.
- `findOptionsForWorkflow`: reusable lookup variation that accepts workflow context.
- `findPurchasableOptions`, `findSellableOptions`, `findSelectableWarehouses`: process-meaningful lookup service methods.
- `findBootstrap`: page bootstrap payload, only when one screen needs multiple option groups at once.
- `resolve`: lookup a workflow-specific setup using IDs or module codes.

This keeps permission behavior readable: full maintenance data is protected by module permission; generic cross-module form data is available through intentional, minimal shared authenticated lookup APIs; workflow-specific selectors are owned by the consuming module while reusing Maintenance lookup services internally.

