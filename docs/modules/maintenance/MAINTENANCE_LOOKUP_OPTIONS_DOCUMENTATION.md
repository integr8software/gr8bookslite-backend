# Maintenance Documentation

## Scope

The `src/modules/maintenance` area contains master-data APIs used by operational and financial workflows. Each submodule follows the NestJS controller/service/module pattern and is protected by `JwtAuthGuard`.

All controller paths are served under the global prefix and URI versioning configured in `src/app.setup.ts`:

```text
/api/v1/{controller-path}
```

Most maintenance resources expose:

- `GET /api/v1/{resource}` for paginated/list views.
- `GET /api/v1/{resource}/options` for reusable dropdown/select/autocomplete options.
- `GET /api/v1/{resource}/:id` for one record.
- `POST /api/v1/{resource}` for creation.
- `PATCH /api/v1/{resource}/:id` for updates.
- Optional `POST /import`, `PATCH /:id/status`, tree, code suggestion, and accounting lookup routes.

## Reusable Lookup API For Options

Use maintenance option endpoints when a frontend or another module needs lightweight selectable records instead of the full list payload. The option endpoints are company-scoped through `@CurrentUser()` and the corresponding lookup service, so callers should not pass a company id manually.

### Common Request Contract

```http
GET /api/v1/{maintenance-resource}/options
Authorization: Bearer <token>
```

Common query parameters:

| Parameter | Type | Description |
| --- | --- | --- |
| `search` | string | Optional text filter. Lookup services typically match names, codes, or other display fields. |
| resource-specific filters | enum/string/boolean | Optional filters such as term date mode, payment classification, discount type, party type, account status, or warehouse branch id. |

### Common Response Pattern

Each endpoint returns a single object whose array property matches the resource name. Option item fields vary by resource, but most include `id`, a display field such as `name` or `code`, and `status` when the model supports active/inactive state.

```json
{
  "terms": [
    {
      "id": "term-id",
      "name": "30 Days",
      "dateMode": "DAY",
      "period": 30,
      "status": "ACTIVE"
    }
  ]
}
```

Frontend components should normalize option responses at the edge of the UI:

```ts
type SelectOption = {
  value: string;
  label: string;
  meta?: Record<string, unknown>;
};
```

Recommended mapping rules:

- Use `id` as `value`.
- Use `name` when available; otherwise combine `code` and `name` for `label`.
- Keep domain-specific fields in `meta` so dependent forms can read values such as `period`, `classification`, `valueType`, `typeName`, or `accountGroupPath`.
- Prefer resource-specific `options/:type` routes when the UI already knows the option category. Use query filters when the category is user-selectable.

## Option Endpoint Inventory

| Area | Endpoint | Response key | Main option fields |
| --- | --- | --- | --- |
| Bank Masterfile | `GET /api/v1/maintenance/financial-management/bank-masterfile/options` | `banks` | `id`, `bankName`, `accountName`, `maskedAccountNumber`, `currencyCode`, `status` |
| Chart of Accounts | `GET /api/v1/maintenance/chart-of-accounts/options` | `accounts` | `id`, `accountCode`, `accountTitle`, `accountType`, `accountNature`, `status` |
| Chart of Accounts | `GET /api/v1/maintenance/chart-of-accounts/options/posting-accounts` | `accounts` | Posting accounts only |
| Chart of Accounts | `GET /api/v1/maintenance/chart-of-accounts/options/all-accounts` | `accounts` | All account options |
| Default Account | `GET /api/v1/maintenance/financial-management/default-accounts/options` | `options` | `id`, `type`, `defaultAccountName`, `accountCode`, `accountTitle`, `status` |
| Default Account | `GET /api/v1/maintenance/financial-management/default-accounts/options/:type` | `options` | `type` must resolve to `expense` or `collection` |
| Default Account | `GET /api/v1/maintenance/financial-management/default-accounts/expense-parent-options` | `options` | Expense parent account options |
| Discount Maintenance | `GET /api/v1/maintenance/discount-maintenance/options` | `discounts` | `id`, `name`, `type`, `valueType`, `value`, `status` |
| Discount Maintenance | `GET /api/v1/maintenance/discount-maintenance/options/:type` | `discounts` | Discounts filtered by type |
| Form Signatories | `GET /api/v1/maintenance/form-signatories/options` | `branches`, `modules` | Branch/unit options and signatory module options |
| Item Categories | `GET /api/v1/maintenance/item-categories/options` | `categories` | `id`, `code`, `name`, accounting setup fields |
| Item Variations | `GET /api/v1/maintenance/item-variations/options` | `variations` | `id`, `code`, `name`, `usage`, `requiredOnItem`, `affectsStock`, `values` |
| Party Maintenance | `GET /api/v1/maintenance/party-maintenance/options` | `parties` | Party identity, type, contact, address, accounting summary fields |
| Party Maintenance | `GET /api/v1/maintenance/party-maintenance/options/:partyType` | `parties` | Parties filtered by type |
| Payment Type Maintenance | `GET /api/v1/maintenance/payment-type-maintenance/options` | `paymentTypes` | `id`, `name`, `classification`, `sortOrder`, `status` |
| Payment Type Maintenance | `GET /api/v1/maintenance/payment-type-maintenance/options/:type` | `paymentTypes` | Payment types filtered by classification/type |
| Responsibility Centers | `GET /api/v1/maintenance/financial-management/responsibility-centers/options` | `responsibilityCenters` | `id`, `code`, `name`, `typeName`, `status` |
| Responsibility Centers | `GET /api/v1/maintenance/financial-management/responsibility-centers/options/:type` | `responsibilityCenters` | Responsibility centers filtered by type |
| Services Maintenance | `GET /api/v1/maintenance/financial-management/services-maintenance/options` | `services` | `id`, `serviceName`, `name`, `status` |
| Terms Maintenance | `GET /api/v1/maintenance/terms-maintenance/options` | `terms` | `id`, `name`, `dateMode`, `period`, `status` |
| Unit of Measurement | `GET /api/v1/maintenance/unit-of-measurement/options` | `units` | `id`, `name`, `symbol`, `quantityMode`, `status` |
| Warehouse Maintenance | `GET /api/v1/maintenance/warehouse-maintenance/options` | `warehouses` | `id`, `code`, `name`, `status` |

## Specialized Lookup Endpoints

Some maintenance APIs return supporting data that is still lookup-like but not a plain `options` list.

| Area | Endpoint | Purpose |
| --- | --- | --- |
| Bank Masterfile | `GET /api/v1/maintenance/financial-management/bank-masterfile/next-account-code` | Suggests the next bank chart account code. |
| Chart of Accounts | `GET /api/v1/maintenance/chart-of-accounts/tree` | Returns hierarchical chart account nodes. |
| Chart of Accounts | `GET /api/v1/maintenance/chart-of-accounts/next-code` | Suggests the next account code using query context. |
| Form Signatories | `GET /api/v1/maintenance/form-signatories/bootstrap` | Returns signatory options and existing setups together. |
| Form Signatories | `GET /api/v1/maintenance/form-signatories/resolve` | Resolves a setup for a branch/unit and module query. |
| Party Maintenance | `GET /api/v1/maintenance/party-maintenance/accounting-options` | Returns chart account option groups used by party accounting setup. |
| Responsibility Centers | `GET /api/v1/maintenance/financial-management/responsibility-centers/tree` | Returns responsibility centers as a hierarchy. |
| Responsibility Centers | `GET /api/v1/maintenance/financial-management/responsibility-centers/classifications` | Returns responsibility center classifications. |
| Responsibility Centers | `GET /api/v1/maintenance/financial-management/responsibility-centers/types` | Returns responsibility center types. |
| Responsibility Centers | `GET /api/v1/maintenance/financial-management/responsibility-centers/code-suggestion` | Suggests the next responsibility center code. |
| Services Maintenance | `GET /api/v1/maintenance/financial-management/services-maintenance/account-options` | Returns service-related chart account options. |
| Services Maintenance | `GET /api/v1/maintenance/financial-management/services-maintenance/next-account-code` | Suggests the next service account code. |
| Warehouse Access | `GET /api/v1/maintenance/warehouse-access/directory/users` | Returns users and branches for assigning warehouse access. |

## Resource Modules

| Folder | Controller path | Notes |
| --- | --- | --- |
| `bank-masterfile` | `maintenance/financial-management/bank-masterfile` | Bank account masterfile, chart account sync, imports, status updates, and next account code. |
| `chart-of-accounts` | `maintenance/chart-of-accounts` | Chart account maintenance, trees, posting/all option lookups, and code generation. |
| `default-account` | `maintenance/financial-management/default-accounts` | Default expense and collection account templates plus expense sub-account creation. |
| `discount-maintenance` | `maintenance/discount-maintenance` | Purchase/sales discount setup with chart account mapping and import support. |
| `form-signatories` | `maintenance/form-signatories` | Form signatory setups by branch/unit and module. |
| `item-category` | `maintenance/item-categories` | Item category setup with accounting defaults. |
| `item-variations` | `maintenance/item-variations` | Item variation definitions and option lookup. |
| `party-maintenance` | `maintenance/party-maintenance` | Customers, suppliers, employees, and other parties with address and accounting setup. |
| `payment-type-maintenance` | `maintenance/payment-type-maintenance` | Payment classifications and option filters. |
| `responsibility-center` | `maintenance/financial-management/responsibility-centers` | Responsibility center classifications, types, hierarchy, and code suggestions. |
| `services-maintenance` | `maintenance/financial-management/services-maintenance` | Service masterfile, chart account support, and code suggestions. |
| `terms-maintenance` | `maintenance/terms-maintenance` | Payment/credit terms and import support. |
| `unit-of-measurement` | `maintenance/unit-of-measurement` | Unit setup with quantity mode filters and import support. |
| `warehouse-access` | `maintenance/warehouse-access` | User access assignments to warehouse branches. |
| `warehouse-maintenance` | `maintenance/warehouse-maintenance` | Warehouse definitions and branch availability. |
| `warehouse-storage` | `maintenance/warehouse-storage` | Warehouse storage read endpoints and lookup service export. |

## Implementation Pattern For New Option APIs

When adding a new maintenance option API:

1. Add a query DTO under the resource `dto` folder when filters are needed.
2. Add a lookup service under `lookups/{resource}-lookup.service.ts`.
3. Scope queries by `user.companyId` or the established company context used by the module.
4. Return only the fields needed by selectors and dependent forms.
5. Expose `GET options` from the controller before `GET :id` so route matching stays unambiguous.
6. Register and export the lookup service from the resource module so other modules can reuse it.
7. Add Swagger `@ApiOkResponse` with the option response DTO.
8. Add or update focused tests for company scoping, filters, active/inactive behavior, and route delegation.

## Validation And Security Notes

- All maintenance controllers use bearer authentication.
- Global validation strips non-whitelisted fields and rejects unknown properties.
- Option endpoints must preserve tenant isolation and should not accept raw company identifiers from clients.
- Type-specific routes should normalize route params and reject unsupported values with `BadRequestException`.
- Keep option payloads stable. If a field is only useful for one form, place it in the resource-specific option DTO instead of expanding every option shape.
