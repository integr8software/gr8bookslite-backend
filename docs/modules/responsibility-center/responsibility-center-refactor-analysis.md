# Responsibility Center Refactor Analysis

## Current Database Models

The current backend stores responsibility centers in one company-owned table:

- `responsibility_centers`
- Prisma model: `ResponsibilityCenter`
- Core fields: `companyId`, `code`, `name`, `category`, `financialType`, `manager`, `parentId`, `status`, `description`, audit user IDs, timestamps, `deletedAt`

Current enums:

- `ResponsibilityCenterCategory`
- `ResponsibilityCenterFinancialType`
- `ResponsibilityCenterStatus`

There are no separate tables for:

- Responsibility Center Classification
- Responsibility Center Type
- Transaction responsibility center assignments

This means the current model mixes two concepts:

- `financialType` is acting as the accounting classification.
- `category` is acting as the responsibility center type.

## Current Relationships

Current relationships are:

- `Company -> ResponsibilityCenter[]`
- `ResponsibilityCenter -> parent ResponsibilityCenter`
- `ResponsibilityCenter -> children ResponsibilityCenter[]`

The hierarchy is company-scoped through service validation, not through a composite database foreign key.

## Current Transaction Tagging Model

The repository contains frontend transaction fields named `responsibilityCenter`, but no normalized backend transaction assignment table was found for responsibility center tagging in the current schema.

The target multi-dimensional model is therefore not yet fully implemented in database form. This refactor must not reduce that target capability. Future transaction modules should reference active responsibility centers by ID and allow multiple assignments per transaction/header/line.

## Current API Routes

Current backend route base:

```text
/api/v1/maintenance/financial-management/responsibility-centers
```

Current operations:

- `GET /`
- `GET /tree`
- `GET /:id`
- `POST /`
- `PATCH /:id`
- `PATCH /:id/status`

The controller is versioned with `version: '1'` and uses `JwtAuthGuard`.

## Current Frontend Pages And Components

Current page:

```text
gr8bookslite-frontend/app/(modules)/maintenance/responsibility-center/page.tsx
```

Current important frontend files:

- `ResponsibilityCenterListPage.tsx`
- `ResponsibilityCenterDrawer.tsx`
- `ResponsibilityCenterTable.tsx`
- `ResponsibilityCenterTree.tsx`
- `useResponsibilityCenter.ts`
- `useResponsibilityCenterFormPage.ts`
- `ResponsibilityCenterApi.ts`
- `ResponsibilityCenterTypes.ts`
- `ResponsibilityCenterConstants.ts`

The form currently shows:

1. Name
2. Classification (`financialType`)
3. Type (`category`)
4. Parent
5. Code
6. Description
7. Manager
8. Status

The refactor requires:

1. Classification
2. Type
3. Name
4. Code
5. Parent Responsibility Center
6. Manager
7. Status

## Current Permissions

The backend uses module code `RC` and checks these actions through the current auth user permissions:

- `RC:VIEW`
- `RC:CREATE`
- `RC:UPDATE`
- `RC:EXPORT`

Admin and super admin roles have reserved access.

## Current Reporting Dependencies

No backend financial report dependency was found that joins directly to `responsibility_centers`. Current frontend mock/transaction fields use responsibility center as a string in some transaction UI areas.

Historical reporting is therefore not yet protected by an assignment snapshot model. Current center IDs are stable, so future transaction assignments should use immutable IDs and avoid clearing references during deactivation.

## Current Status And Deletion Behavior

Current behavior:

- Status is changed by `PATCH /:id/status`.
- Rows are not deleted.
- `deletedAt` exists but there is no delete endpoint.
- Deactivation currently affects only the selected row.

Required behavior:

- Deactivation remains soft.
- Deactivating a parent cascades to active descendants in one transaction.
- Reactivation affects only the selected center.
- Reactivating a child under an inactive parent should be blocked.

## Current Code Generation Behavior

There is no backend code-generation endpoint or safe sequence model.

Codes are manually supplied by the frontend and normalized to uppercase.

The refactor requires code generation from:

```text
classification prefix + type prefix + sequence
```

The implementation should use database-level uniqueness plus a transaction/advisory lock for safe generation.

## Current Hierarchy Validation

Current validation:

- Parent must belong to same company.
- Self-parent is blocked.
- Basic cycle detection walks parent IDs.

Missing validation:

- Inactive parent should not be selectable for new/updated centers.
- Deactivation should cascade to descendants.
- Reactivation should block inactive parent hierarchy.

## Risks And Compatibility Concerns

- Existing API consumers currently expect `category` and `financialType`.
- Existing database rows do not have a normalized type ID.
- Existing frontend constants encode the old type/classification mapping.
- Existing company bootstrap seed writes direct `category` and `financialType` values.
- Migration must map old records without deleting history.

## Files Expected To Change

Backend:

- `prisma/schema.prisma`
- new Prisma migration
- `src/modules/maintenance/responsibility-center/**`
- `src/modules/maintenance/responsibility-center/seed/responsibility-center.seed.ts`
- `prisma/company-bootstrap/company-bootstrap.registry.ts` if field assumptions change

Frontend:

- Responsibility Center types/constants/API/hook/drawer files

Docs:

- `docs/modules/responsibility-center/responsibility-center-refactor-analysis.md`
- `docs/modules/responsibility-center/responsibility-center-refactor-implementation-plan.md`
- `docs/modules/responsibility-center/responsibility-center-refactor-verification.md`

## Existing Functionality That Must Remain Untouched

- Company scoping
- Existing route base
- Permission enforcement
- Tree/list page behavior
- Existing active/inactive history visibility
- Multi-dimensional future direction
- Existing frontend table and drawer workflow

## Data Migration Risks

Existing records can be mapped automatically because each record has:

- `financialType`
- `category`

Mapping strategy:

- `financialType` becomes the classification.
- `category` becomes the type under that classification.
- A company-owned type is created per company/classification/category combination.
- Existing responsibility centers receive `typeId`.

Fallback types should only be needed if unexpected legacy enum values are found.

## Recommended Normalized Schema

Add:

- `ResponsibilityCenterClassification`
- `ResponsibilityCenterType`

Update:

- `ResponsibilityCenter.typeId`

Keep temporarily for API compatibility:

- `ResponsibilityCenter.category`
- `ResponsibilityCenter.financialType`

The backend should enforce consistency between `typeId`, `category`, and `financialType` until older frontend and reporting dependencies are removed.

## Classification And Type Mixing

The current implementation mixes them:

- `financialType` is classification.
- `category` is type.

The refactor should make this explicit:

```text
ResponsibilityCenter -> ResponsibilityCenterType -> ResponsibilityCenterClassification
```

## Automatic Mapping Feasibility

Existing records can be mapped automatically from current enum fields.

No current data requires manual intervention for this first normalized migration.
