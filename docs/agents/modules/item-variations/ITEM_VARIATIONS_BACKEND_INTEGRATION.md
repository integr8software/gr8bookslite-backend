# Item Variations Backend Integration

This note describes how to wire the Item Variations frontend module to the backend while keeping the same modular shape used by Term Management.

## Frontend Module

Route:

```txt
gr8bookslite-frontend/app/(modules)/maintenance/item-variations/page.tsx
```

Source folders:

```txt
gr8bookslite-frontend/app/src/constants/modules/maintenance/item-variations/
gr8bookslite-frontend/app/src/data/modules/maintenance/item-variations/
gr8bookslite-frontend/app/src/hooks/modules/maintenance/item-variations/
gr8bookslite-frontend/app/src/services/modules/maintenance/item-variations/
gr8bookslite-frontend/app/src/types/modules/maintenance/item-variations/
gr8bookslite-frontend/app/src/ui/modules/maintenance/item-variations/
gr8bookslite-frontend/app/src/validations/modules/maintenance/item-variations/
```

The route stays thin and renders `ItemVariationsListPage`. UI stays in `ui`, table state and page orchestration stay in `hooks`, API calls stay in `services`, and form validation stays in `validations`.

## Current Frontend Refactor

The module now follows the Term Management pattern:

- `ItemVariationsApi.ts` owns API calls and frontend/API mappers.
- `ItemVariationsQueryKeys.ts` owns React Query cache keys.
- `useItemVariations.ts` owns React Query loading, refresh, mutation, permission, and statistic state.
- `useItemVariationsListPage.ts` owns filters, drawer state, table state, and status confirmation orchestration.
- `ItemVariationsValidation.ts` owns Zod validation.

`ItemVariationsApi.ts` is wired to the backend route and now lets API errors surface through the shared API client/query layer.

## Backend Placement

Follow the backend modularity guide and place backend code under the Maintenance domain:

```txt
gr8bookslite-backend/src/modules/maintenance/item-variations/
  item-variations.module.ts
  item-variations.controller.ts
  item-variations.service.ts
  dto/
    create-item-variation.dto.ts
    update-item-variation.dto.ts
    item-variation-value.dto.ts
  mappers/
    item-variation.mapper.ts
  types/
    item-variation-with-values.type.ts
```

The module is registered in the application module with the other Maintenance modules.

## API Path

Frontend constant:

```ts
export const ItemVariationsApiPath = "/maintenance/item-variations";
```

Expected endpoints:

```txt
GET   /maintenance/item-variations
POST  /maintenance/item-variations
PATCH /maintenance/item-variations/:id
```

Future endpoints:

```txt
POST  /maintenance/item-variations/import
PATCH /maintenance/item-variations/:id/values/reorder
```

## Response Contract

`GET /maintenance/item-variations` should return:

```ts
type ApiItemVariationsListResponse = {
  variations: ApiItemVariation[];
  permissions: ItemVariationsPermissions;
  statistics: ItemVariationsStatistics;
};
```

Variation shape:

```ts
type ApiItemVariation = {
  id: string;
  code: string;
  name: string;
  usage: "ITEM_DETAIL" | "STOCK_CLASSIFICATION" | "VARIANT";
  values: ApiItemVariationValue[];
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
type ApiItemVariationValue = {
  id: string;
  label: string;
  isUsed: boolean;
  status: "ACTIVE" | "INACTIVE";
};
```

Save response:

```ts
type ApiItemVariationSaveResponse = {
  variation: ApiItemVariation;
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

- Variation name must be unique per tenant/company scope.
- Value labels must be unique within an variation.
- Used values must not be deleted.
- Used values may be deactivated so they are unavailable for new item assignments.
- Inactive values must remain available for historical records.
- Value order should be persisted by `sortOrder`.

## Permissions

Match the Term Management permissions style:

```ts
type ItemVariationsPermissions = {
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
type ItemVariationsStatistics = {
  totalVariations: number;
  activeVariations: number;
  inactiveVariations: number;
  totalValues: number;
  activeValues: number;
  inactiveValues: number;
};
```

## Frontend Integration Notes

`ItemVariationsApi.ts` keeps the API mappers and no longer stores module-scoped mock fallback state. `useItemVariations.ts` invalidates `ItemVariationsQueryKeys.all()` after create/update mutations.

## Backend Checklist

1. Prisma models and migration exist for variations and ordered values.
2. DTOs validate create/update payloads with class-validator.
3. Mapper keeps Prisma records out of controller responses.
4. Service methods support list, create, update, and value reordering through full value sync.
5. Used values cannot be deleted; they can be deactivated.
6. Permissions and statistics are calculated in the service layer.
7. Module is registered with the app Maintenance modules.
8. Tests still need to be added for uniqueness, used-value protection, status changes, and sort order.

## Notes

This module is company-owned maintenance data. If backend implementation seeds default item variations for new companies, wire that through company bootstrap rather than a standalone manual seeder.
