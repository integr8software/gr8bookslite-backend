# Item Category Backend Integration

This note documents how to wire `item-category` to the backend while following:

- `gr8bookslite-frontend/AGENTS.md`
- `gr8bookslite-frontend/FRONTEND_MAP.md`
- `gr8bookslite-backend/docs/agents/ARCHITECTURE_MODULARITY_GUIDE.md`
- the existing `term-management` frontend API/query/store pattern

The current item-category UI is mostly feature-complete, but it still uses the item-management mock/setup store. Backend wiring should replace that mock boundary with a dedicated item-category API service and authoritative backend rules.

## Target Ownership

Frontend owns:

- table, drawer, filters, export, and optimistic/loading states
- user-friendly Zod validation before submit
- API calls through `ApiClient`
- React Query cache and mutation orchestration

Backend owns:

- database schema and migrations
- accounting setup business rules
- account-title creation or reuse
- parent/child integrity checks
- transaction-safe updates
- permissions and tenant scope
- response mapping and statistics

Frontend validation is helpful UX only. The backend must enforce the same critical rules.

## Frontend Files

Keep the route thin:

```txt
app/(modules)/maintenance/item-category/page.tsx
```

Keep feature code split by concern:

```txt
app/src/constants/modules/maintenance/item-category/
  ItemCategoryConstants.ts

app/src/data/modules/maintenance/item-category/
  ItemCategoryData.ts

app/src/hooks/modules/maintenance/item-category/
  useItemCategory.ts
  useItemCategoryPage.ts
  useItemCategoryTable.ts

app/src/services/modules/maintenance/item-category/
  ItemCategoryApi.ts
  ItemCategoryQueryKeys.ts

app/src/types/modules/maintenance/item-category/
  ItemCategoryTypes.ts

app/src/ui/modules/maintenance/item-category/
  ItemCategoryListPage.tsx
  ItemCategoryTable.tsx
  ItemCategoryTableFilters.tsx
  ItemCategoryTableRow.tsx
  ItemCategoryDrawer.tsx
  ItemCategoryFields.tsx
  ItemCategoryText.ts

app/src/validations/modules/maintenance/item-category/
  ItemCategoryValidation.ts
```

Do not put API calls, validation rules, constants, or mappers in `ui`.

## API Path

Add this to `ItemCategoryConstants.ts`:

```ts
export const ItemCategoryApiPath = "/maintenance/item-categories";
```

Use a dedicated endpoint rather than overloading general item setup endpoints.

## Query Keys

Use callable query keys like `term-management`:

```ts
export const ItemCategoryQueryKeys = {
  all: () => ["maintenance", "item-category"] as const,
  categories: () => [...ItemCategoryQueryKeys.all(), "categories"] as const,
};
```

When tenant scope is available for this module, include company and branch/unit identifiers in query keys:

```ts
categories: (companyId: string, branchId: string) =>
  ["maintenance", "item-category", companyId, branchId, "categories"] as const,
```

## Frontend API Service

Create `ItemCategoryApi.ts` with the same shape as `TermManagementApi.ts`.

```ts
import { ApiClient } from "@/app/src/services/shared/api/ApiClient";
import { ItemCategoryApiPath } from "@/app/src/constants/modules/maintenance/item-category/ItemCategoryConstants";
import type {
  ApiItemCategory,
  ApiItemCategoryListResponse,
  ApiItemCategorySaveResponse,
  ItemCategoryFormValues,
  ItemCategoryListResponse,
  ItemCategoryTableRowData,
} from "@/app/src/types/modules/maintenance/item-category/ItemCategoryTypes";

export async function fetchItemCategories(): Promise<ItemCategoryListResponse> {
  const response = await ApiClient.get<ApiItemCategoryListResponse>(
    ItemCategoryApiPath,
  );

  return {
    categories: response.data.categories.map(mapApiItemCategory),
    statistics: response.data.statistics,
    permissions: response.data.permissions,
  };
}

export async function createItemCategory(
  values: ItemCategoryFormValues,
): Promise<ItemCategoryTableRowData> {
  const response = await ApiClient.post<ApiItemCategorySaveResponse>(
    ItemCategoryApiPath,
    toApiItemCategoryPayload(values),
  );

  return mapApiItemCategory(response.data.category);
}

export async function updateItemCategory(
  category: ItemCategoryTableRowData,
): Promise<ItemCategoryTableRowData> {
  const response = await ApiClient.patch<ApiItemCategorySaveResponse>(
    `${ItemCategoryApiPath}/${category.record.id}`,
    toApiItemCategoryPayload({
      name: category.record.name,
      parentId: category.parentId,
      description: category.record.description,
      accountingSetupMode:
        category.accountingSetupStatus === "Configured" ? "own" : "inherit",
      accountingSetup: category.effectiveAccountingSetup,
      allowSubCategory: category.record.allowSubCategory ?? true,
      status: category.record.status,
    }),
  );

  return mapApiItemCategory(response.data.category);
}

function toApiItemCategoryPayload(values: ItemCategoryFormValues) {
  return {
    name: values.name.trim(),
    parentId: values.parentId || null,
    description: values.description.trim(),
    accountingSetupMode:
      values.accountingSetupMode === "own" ? "AUTO_CREATE" : "INHERIT",
    accountingSetup:
      values.accountingSetupMode === "own"
        ? {
            inventoryAccount: values.accountingSetup.inventoryAccount,
            salesAccount: values.accountingSetup.salesAccount,
            costOfSalesAccount: values.accountingSetup.costOfSalesAccount,
            expenseAccount: values.accountingSetup.expenseAccount,
          }
        : null,
    allowSubCategory: values.allowSubCategory,
    status: values.status === "Active" ? "ACTIVE" : "INACTIVE",
  };
}
```

The mapper should normalize backend enums, nulls, dates, audit fields, and effective inherited accounting setup into the frontend row model.

## Frontend Store Hook

Create `useItemCategory.ts` similar to `useTermManagement.ts`.

Responsibilities:

- call `fetchItemCategories`
- expose rows, permissions, statistics, loading, refreshing, mutating, and refresh function
- run create/update/deactivate mutations
- invalidate `ItemCategoryQueryKeys.all()`
- show success/error toasts

Sketch:

```ts
const categoriesQuery = useQuery({
  queryKey: ItemCategoryQueryKeys.categories(),
  queryFn: fetchItemCategories,
});

const updateCategoryMutation = useMutation({
  mutationFn: updateItemCategory,
  onSuccess: () => {
    void queryClient.invalidateQueries({
      queryKey: ItemCategoryQueryKeys.all(),
    });
    toast.success("Item category updated successfully.");
  },
  onError: (error) => {
    toast.error(
      error instanceof Error
        ? error.message
        : "Could not update item category. Please try again.",
    );
  },
});
```

Then update `useItemCategoryPage.ts` to consume `useItemCategoryStore` instead of `useItemManagementStore`.

## Required Frontend Types

Add API-facing types near the existing item-category types:

```ts
export type ApiItemCategoryStatus = "ACTIVE" | "INACTIVE";
export type ApiItemCategoryAccountingSetupMode = "INHERIT" | "AUTO_CREATE";

export type ApiItemCategory = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  parentId: string | null;
  accountingSetupMode: ApiItemCategoryAccountingSetupMode;
  accountingSetup: Partial<ItemCategoryAccountingSetup> | null;
  effectiveAccountingSetup: ItemCategoryAccountingSetup;
  inheritedAccountingSourceName: string | null;
  allowSubCategory: boolean;
  status: ApiItemCategoryStatus;
  createdBy: string | null;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string;
  usedByItemCount: number;
  children?: ApiItemCategory[];
};

export type ItemCategoryPermissions = {
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canExport: boolean;
};

export type ItemCategoryStatistics = {
  totalCount: number;
  activeCount: number;
  inactiveCount: number;
  configuredCount: number;
  inheritedCount: number;
  subcategoryLockedCount: number;
};

export type ApiItemCategoryListResponse = {
  categories: ApiItemCategory[];
  statistics: ItemCategoryStatistics;
  permissions: ItemCategoryPermissions;
};

export type ApiItemCategorySaveResponse = {
  category: ApiItemCategory;
};
```

## Backend Module Shape

Add a dedicated backend module under maintenance:

```txt
gr8bookslite-backend/src/modules/maintenance/item-category/
  item-category.module.ts
  item-category.controller.ts
  item-category.service.ts
  dto/
    create-item-category.dto.ts
    update-item-category.dto.ts
  mappers/
    item-category.mapper.ts
  types/
    item-category-with-relations.type.ts
  utils/
    item-category-accounting.util.ts
```

Controllers stay thin. Services own business rules and Prisma access. Mappers return stable API response objects.

## Backend Routes

Recommended controller routes:

```txt
GET    /maintenance/item-categories
POST   /maintenance/item-categories
PATCH  /maintenance/item-categories/:id
PATCH  /maintenance/item-categories/:id/status
```

Optional later:

```txt
POST /maintenance/item-categories/:id/accounting/rebuild
```

Use route guards and module permissions consistent with other maintenance modules.

## Backend DTO Rules

Use DTO validation for request contracts:

```ts
export class CreateItemCategoryDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  parentId?: string | null;

  @IsString()
  description!: string;

  @IsIn(["INHERIT", "AUTO_CREATE"])
  accountingSetupMode!: "INHERIT" | "AUTO_CREATE";

  @IsBoolean()
  allowSubCategory!: boolean;

  @IsIn(["ACTIVE", "INACTIVE"])
  status!: "ACTIVE" | "INACTIVE";
}
```

Backend service must additionally enforce:

- root categories cannot inherit
- selected parent must exist
- selected parent must allow subcategories when changing parent
- no circular parent selection
- no duplicate category name under the same parent
- `AUTO_CREATE` must create or resolve all required item accounts
- `INHERIT` must resolve a complete effective setup from parent

## Accounting Rules

The backend should treat accounting setup as authoritative.

Rules:

- Root category must use `AUTO_CREATE`.
- Child category may use `INHERIT` or `AUTO_CREATE`.
- `INHERIT` stores no category-owned account ids.
- `AUTO_CREATE` creates or resolves account titles under these COA parent groups:
  - `Item Inventories`
  - `Item Sales`
  - `Item Cost of Sales`
  - `Item Expenses`
- Existing account titles should not be deleted when a category changes to inherited.
- Existing transactions should never be reposted or rewritten by setup changes.
- Changing `AUTO_CREATE -> INHERIT` should write an audit/history event.

## Backend Response Mapping

Mapper should return:

- own accounting setup if configured
- effective accounting setup after inheritance resolution
- inherited accounting source name
- audit fields
- used-by-item count
- children or a flat list with parent ids

Frontend currently supports tree rows; a nested response is easiest to map. A flat response is fine if parent ids are complete and stable.

## Seeder / Bootstrap Requirements

This module depends on company-owned defaults:

- COA parent groups for item inventory, sales, cost of sales, and expense accounts
- default account group mappings for item category auto-creation

Per backend architecture guide:

- company-owned defaults belong in company bootstrap
- do not leave this as a manual-only seeder
- clean deploy should provision the COA parents and mappings automatically

Backend bootstrap should ensure these exist:

```txt
Item Inventories
Item Sales
Item Cost of Sales
Item Expenses
```

## Migration Notes

If item categories become a real backend table, model fields should include:

```txt
id
companyId
branchId or unitId if branch-scoped
code
name
description
parentId
accountingSetupMode
inventoryAccountId
salesAccountId
costOfSalesAccountId
expenseAccountId
allowSubCategory
status
createdById
updatedById
createdAt
updatedAt
```

Add indexes:

```txt
companyId, parentId, name
companyId, status
companyId, accountingSetupMode
```

Add a self-relation for parent/children.

## Frontend Refactor Checklist

When backend endpoints are ready:

1. Add `ItemCategoryApiPath`.
2. Add `ItemCategoryApi.ts`.
3. Add `useItemCategory.ts`.
4. Replace `useItemManagementStore` usage inside `useItemCategoryPage.ts`.
5. Remove mock item category dependency from item-management data.
6. Keep `useItemCategoryTable.ts`, table filters, and UI components unchanged as much as possible.
7. Use backend statistics instead of recalculating all statistics in the page hook, unless the backend intentionally returns only rows.
8. Keep Zod validation as UX, but rely on backend validation errors as authority.

## QA Checklist

Test these before calling backend wiring complete:

- Create root category. It auto-creates accounts.
- Create child category with inherited accounting setup.
- Create child category with auto-created accounting setup.
- Change auto-created child to inherited and confirm warning.
- Change inherited child to auto-created.
- Try setting root category to inherited. It must fail.
- Try circular parent selection. It must fail.
- Try duplicate category name under same parent. It must fail.
- Deactivate parent. Descendants become inactive/locked.
- Reactivate parent. Descendants restore previous status.
- Existing transactions keep original account postings.
- Audit columns update after create, edit, and status change.
- Export respects visible columns and filtered rows.

## Checks

Frontend:

```bash
npm run lint
npm run build
```

Backend:

```bash
npm run typecheck
npm test -- --runInBand
```

Also run any company-bootstrap/provision checks if item category accounting defaults are moved into bootstrap.
