# Item Attributes Backend Integration

This note describes how to wire the Item Attributes frontend module to the backend while keeping the same modular shape used by Term Management.

## Frontend Module

Route:

```txt
gr8bookslite-frontend/app/(modules)/maintenance/item-attributes/page.tsx
```

Source folders:

```txt
gr8bookslite-frontend/app/src/constants/modules/maintenance/item-attributes/
gr8bookslite-frontend/app/src/data/modules/maintenance/item-attributes/
gr8bookslite-frontend/app/src/hooks/modules/maintenance/item-attributes/
gr8bookslite-frontend/app/src/services/modules/maintenance/item-attributes/
gr8bookslite-frontend/app/src/types/modules/maintenance/item-attributes/
gr8bookslite-frontend/app/src/ui/modules/maintenance/item-attributes/
gr8bookslite-frontend/app/src/validations/modules/maintenance/item-attributes/
```

The route stays thin and renders `ItemAttributesListPage`. UI stays in `ui`, table state and page orchestration stay in `hooks`, API calls stay in `services`, and form validation stays in `validations`.

## Current Frontend Refactor

The module now follows the Term Management pattern:

- `ItemAttributesApi.ts` owns API calls and frontend/API mappers.
- `ItemAttributesQueryKeys.ts` owns React Query cache keys.
- `useItemAttributes.ts` owns React Query loading, refresh, mutation, permission, and statistic state.
- `useItemAttributesListPage.ts` owns filters, drawer state, table state, and status confirmation orchestration.
- `ItemAttributesValidation.ts` owns Zod validation.

`ItemAttributesApi.ts` is wired to the backend route and now lets API errors surface through the shared API client/query layer.

## Backend Placement

Follow the backend modularity guide and place backend code under the Maintenance domain:

```txt
gr8bookslite-backend/src/modules/maintenance/item-attributes/
  item-attributes.module.ts
  item-attributes.controller.ts
  item-attributes.service.ts
  dto/
    create-item-attribute.dto.ts
    update-item-attribute.dto.ts
    item-attribute-value.dto.ts
  mappers/
    item-attribute.mapper.ts
  types/
    item-attribute-with-values.type.ts
```

The module is registered in the application module with the other Maintenance modules.

## API Path

Frontend constant:

```ts
export const ItemAttributesApiPath = "/maintenance/item-attributes";
```

Expected endpoints:

```txt
GET   /maintenance/item-attributes
POST  /maintenance/item-attributes
PATCH /maintenance/item-attributes/:id
```

Future endpoints:

```txt
POST  /maintenance/item-attributes/import
PATCH /maintenance/item-attributes/:id/values/reorder
```

## Response Contract

`GET /maintenance/item-attributes` should return:

```ts
type ApiItemAttributesListResponse = {
  attributes: ApiItemAttribute[];
  permissions: ItemAttributesPermissions;
  statistics: ItemAttributesStatistics;
};
```

Attribute shape:

```ts
type ApiItemAttribute = {
  id: string;
  code: string;
  name: string;
  usage: "ITEM_DETAIL" | "STOCK_CLASSIFICATION" | "VARIANT";
  values: ApiItemAttributeValue[];
  requiredOnItem: boolean;
  affectsStock: boolean;
  status: "ACTIVE" | "INACTIVE";
  createdBy: string | null;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
};
```

Value shape:

```ts
type ApiItemAttributeValue = {
  id: string;
  label: string;
  isUsed: boolean;
  status: "ACTIVE" | "INACTIVE";
};
```

Save response:

```ts
type ApiItemAttributeSaveResponse = {
  attribute: ApiItemAttribute;
};
```

## Payload Contract

The frontend sends:

```ts
{
  name: string;
  usage?: "ITEM_DETAIL" | "STOCK_CLASSIFICATION" | "VARIANT";
  values: Array<{
    id: string;
    label: string;
    isUsed: boolean;
    sortOrder: number;
    status: "ACTIVE" | "INACTIVE";
  }>;
  requiredOnItem?: boolean;
  affectsStock?: boolean;
  status: "ACTIVE" | "INACTIVE";
}
```

The backend should own authoritative rules:

- Attribute name must be unique per tenant/company scope.
- Value labels must be unique within an attribute.
- Used values must not be deleted.
- Used values may be deactivated so they are unavailable for new item assignments.
- Inactive values must remain available for historical records.
- Value order should be persisted by `sortOrder`.

## Permissions

Match the Term Management permissions style:

```ts
type ItemAttributesPermissions = {
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canExport: boolean;
  canImport: boolean;
};
```

Reserved frontend roles currently receive full access, matching the Term Management fallback. Backend permissions should become authoritative once implemented.

## Statistics

Return module cards from backend:

```ts
type ItemAttributesStatistics = {
  totalAttributes: number;
  activeAttributes: number;
  inactiveAttributes: number;
  totalValues: number;
  activeValues: number;
  inactiveValues: number;
};
```

## Frontend Integration Notes

`ItemAttributesApi.ts` keeps the API mappers and no longer stores module-scoped mock fallback state. `useItemAttributes.ts` invalidates `ItemAttributesQueryKeys.all()` after create/update mutations.

## Backend Checklist

1. Prisma models and migration exist for attributes and ordered values.
2. DTOs validate create/update payloads with class-validator.
3. Mapper keeps Prisma records out of controller responses.
4. Service methods support list, create, update, and value reordering through full value sync.
5. Used values cannot be deleted; they can be deactivated.
6. Permissions and statistics are calculated in the service layer.
7. Module is registered with the app Maintenance modules.
8. Tests still need to be added for uniqueness, used-value protection, status changes, and sort order.

## Notes

This module is company-owned maintenance data. If backend implementation seeds default item attributes for new companies, wire that through company bootstrap rather than a standalone manual seeder.
