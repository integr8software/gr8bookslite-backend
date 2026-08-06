# Responsibility Center Refactor Implementation Plan

## Final Target Architecture

Responsibility Center setup will follow:

```text
ResponsibilityCenterClassification
  -> ResponsibilityCenterType
    -> ResponsibilityCenter
```

Classification defines accounting/management behavior:

- Cost Center
- Revenue Center
- Profit Center
- Investment Center

Type defines the organizational dimension under a classification:

- Department
- Branch
- Project
- Business Unit
- Sales Team
- Warehouse

Responsibility Center is the actual company-owned center used by transactions and reports.

## Prisma Changes

Add:

- `ResponsibilityCenterClassification`
- `ResponsibilityCenterType`
- `ResponsibilityCenterTrackingBehavior`

Update:

- `ResponsibilityCenter.typeId`
- Relations from `Company` to responsibility center types.

Keep for compatibility:

- `ResponsibilityCenter.category`
- `ResponsibilityCenter.financialType`

The compatibility fields will be synchronized from the selected type/classification.

## Migration Strategy

Forward-only migration:

1. Create classification table.
2. Create type table.
3. Insert four system classifications.
4. Create company-owned types from existing responsibility center `category` + `financialType` pairs.
5. Add `responsibility_centers.type_id`.
6. Backfill `type_id` for existing centers.
7. Make `type_id` required.
8. Add indexes and foreign keys.

No responsibility center rows are deleted.

## Data Mapping Strategy

Existing mapping:

```text
financialType -> classification
category -> type
```

Examples:

- `COST_CENTER` + `DEPARTMENT` -> Cost Center / Department
- `PROFIT_CENTER` + `BRANCH` -> Profit Center / Branch
- `REVENUE_CENTER` + `SALES_TERRITORY` -> Revenue Center / Sales Territory

Type code prefixes will be derived from the category.

Fallback:

- If unexpected data appears, create a General type under the matching classification.

## Backend Changes

Add endpoints:

- `GET /api/v1/maintenance/financial-management/responsibility-centers/classifications`
- `GET /api/v1/maintenance/financial-management/responsibility-centers/types`
- `GET /api/v1/maintenance/financial-management/responsibility-centers/code-suggestion`

Update create/update:

- Accept `typeId`.
- Validate type belongs to the active company and selected classification.
- Keep accepting old `category`/`financialType` during transition.
- Generate a safe code when no manual code is supplied.
- Validate parent company/status.
- Prevent cycles.

Update status:

- Inactivate selected center and active descendants in one transaction.
- Reactivate only selected center.
- Block reactivation when parent is inactive.

## Frontend Changes

Update Responsibility Center drawer:

1. Classification
2. Type
3. Name
4. Code
5. Parent Responsibility Center
6. Manager
7. Status
8. Description

Frontend behavior:

- Load classifications and company types from backend.
- Disable Type until Classification is selected.
- Filter Type by Classification.
- Clear invalid Type when Classification changes.
- Update Name label dynamically.
- Request code suggestion after Classification + Type are selected.
- Preserve manually edited codes.
- Do not auto-regenerate code on edit.

## Transaction Integration Changes

No transaction database redesign in this phase.

Selector-facing behavior should use active centers only for new transactions. Historical transaction values should remain displayable after deactivation.

## Reporting Compatibility

Existing reports are not currently joined to normalized responsibility center tables. Existing `category` and `financialType` fields remain available to avoid breaking report/filter expectations.

Future reporting can join:

```text
responsibility_centers -> responsibility_center_types -> responsibility_center_classifications
```

## Audit Changes

This phase uses existing audit columns:

- `createdByUserId`
- `updatedByUserId`
- `createdAt`
- `updatedAt`

Cascade deactivation will set `updatedByUserId` on all affected rows.

No new audit framework is introduced.

## Permission Changes

Keep existing `RC` permission model:

- View
- Create
- Update
- Export

Classification/type endpoints require `RC:VIEW`.
Create/update/status still require `RC:CREATE` or `RC:UPDATE`.

## Testing Strategy

Backend:

- Type filtering by classification.
- Type/classification compatibility.
- Code suggestion.
- Manual duplicate code rejection.
- Parent ownership and cycle validation.
- Inactive parent rejection.
- Cascade deactivation.
- Reactivation does not reactivate descendants.

Frontend:

- Type disabled until classification.
- Filtered type options.
- Dynamic label.
- Manual code preservation.

## Deployment Order

1. Pull code.
2. Run guarded Prisma migration.
3. Generate Prisma client.
4. Build backend.
5. Build frontend.
6. Restart PM2 services.
7. Run company bootstrap repair if existing companies need defaults.

## Rollback And Recovery

This is a forward migration.

Rollback approach:

- Restore database backup if migration must be reversed.
- Application can continue reading old `category` and `financialType` fields during the transition because they remain populated.

## Scope Control

This phase does not introduce:

- New transaction assignment tables.
- Event sourcing.
- CQRS.
- A generic metadata framework.
- Hard deletes.
- Full reporting redesign.
