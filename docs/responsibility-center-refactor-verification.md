# Responsibility Center Refactor Verification

## Files Changed

Backend:

- `prisma/schema.prisma`
- `prisma/migrations/20260716090000_refactor_responsibility_center_classification_types/migration.sql`
- `src/modules/maintenance/responsibility-center/responsibility-center.controller.ts`
- `src/modules/maintenance/responsibility-center/responsibility-center.service.ts`
- `src/modules/maintenance/responsibility-center/dto/create-responsibility-center.dto.ts`
- `src/modules/maintenance/responsibility-center/dto/get-responsibility-center-list-query.dto.ts`
- `src/modules/maintenance/responsibility-center/mappers/responsibility-center.mapper.ts`
- `src/modules/maintenance/responsibility-center/prisma/responsibility-center.include.ts`
- `src/modules/maintenance/responsibility-center/seed/responsibility-center.seed.ts`
- `src/modules/maintenance/responsibility-center/responsibility-center.service.spec.ts`
- `src/modules/maintenance/responsibility-center/utils/responsibility-center-defaults.util.ts`

Frontend:

- `app/src/types/modules/maintenance/responsibility-center/ResponsibilityCenterTypes.ts`
- `app/src/services/modules/maintenance/responsibility-center/ResponsibilityCenterApi.ts`
- `app/src/services/modules/maintenance/responsibility-center/ResponsibilityCenterQueryKeys.ts`
- `app/src/hooks/modules/maintenance/responsibility-center/useResponsibilityCenter.ts`
- `app/src/hooks/modules/maintenance/responsibility-center/useResponsibilityCenterFormPage.ts`
- `app/src/ui/modules/maintenance/responsibility-center/ResponsibilityCenterDrawer.tsx`
- `app/src/ui/modules/general-journal/journal-voucher/JournalVoucherDataEntryTable.tsx`
- `app/src/data/modules/maintenance/financial-management/responsibility-center/ResponsibilityCenterData.ts`
- `app/src/validations/modules/maintenance/responsibility-center/ResponsibilityCenterValidation.ts`

Documentation:

- `docs/responsibility-center-refactor-analysis.md`
- `docs/responsibility-center-refactor-implementation-plan.md`
- `docs/responsibility-center-refactor-verification.md`

## Migration Created

```text
20260716090000_refactor_responsibility_center_classification_types
```

Migration behavior:

1. Creates `ResponsibilityCenterTrackingBehavior`.
2. Creates `responsibility_center_classifications`.
3. Seeds standard classifications:
   - `CC` Cost Center
   - `RC` Revenue Center
   - `PC` Profit Center
   - `IC` Investment Center
4. Creates `responsibility_center_types`.
5. Adds `responsibility_centers.type_id`.
6. Backfills `type_id` from existing `financial_type + category`.
7. Makes `type_id` required.
8. Adds indexes and foreign keys.
9. Creates new `updated_at` columns without database defaults so Prisma `@updatedAt` remains the source of updates.

## Existing Data Migration Result

The migration is designed to map all existing rows automatically:

```text
financial_type -> classification
category -> responsibility center type
```

No historical responsibility center records are deleted.

## Records Assigned Fallback Types

The migration should assign no fallback records because existing records use enum-backed `financial_type` and `category`.

If an unexpected unmapped row exists, the migration raises an exception instead of silently corrupting data.

## API Routes Changed

Existing route base remains:

```text
/api/v1/maintenance/financial-management/responsibility-centers
```

Added:

- `GET /classifications`
- `GET /types?classificationId=...`
- `GET /code-suggestion?typeId=...`

Existing:

- `GET /`
- `GET /tree`
- `GET /:id`
- `POST /`
- `PATCH /:id`
- `PATCH /:id/status`

## UI Changes

The Responsibility Center drawer now follows:

1. Classification
2. Type
3. Name
4. Code
5. Parent Responsibility Center
6. Manager
7. Status
8. Description

Behavior:

- Type is disabled until Classification is selected.
- Type options are filtered by Classification.
- Changing Classification clears Type, Parent, and generated Code.
- Name is disabled until Classification is selected.
- Name label stays as `Name` until Classification and Type are selected, then changes to `<Type> Name`.
- Code is optional in the UI and is disabled until Type is selected.
- Code suggestion uses backend sequence logic and is based on Classification + Type prefix, not the Responsibility Center name.
- The frontend no longer falls back to generating codes from the name when Code is blank; blank Code is sent to the backend so the backend can generate the Classification + Type code.
- Manual code changes are preserved.
- Status changes use the dedicated status endpoint. Deactivation applies to the selected center and descendants. Activation applies to inactive ancestors, the selected center, and descendants so the hierarchy cannot end up with an active child under an inactive parent.

## Tests Added

Added dedicated backend unit tests in:

```text
src/modules/maintenance/responsibility-center/responsibility-center.service.spec.ts
```

Coverage added:

- automatic code generation with dynamic prefix escaping
- code uniqueness scoped by company
- hierarchy cycle rejection
- company isolation for center lookup
- inactive status cascade to active descendants
- active status cascade to inactive descendants
- active status cascade to inactive ancestors when activating a sub-parent
- Classification-Type compatibility rejection
- custom type names no longer silently falling back to legacy `TEAM`

Focused frontend tests were not added because the frontend repository currently has no configured test runner or test script. The related frontend behavior was kept in narrow hook/form logic and verified through lint and production build. Adding Vitest/Jest/Playwright should be handled as an explicit frontend testing infrastructure task.

## Commands Executed

Backend:

```bash
npm run db:validate:local
npm run db:generate:local
npm run typecheck
npm run build
npm test -- responsibility-center --runInBand
npm test -- --runInBand
npm run db:migrate:local
```

Frontend:

```bash
npm run lint
npm run build
```

## Test Results

Backend:

- `npm run db:validate:local`: passed
- `npm run db:generate:local`: passed
- `npm run typecheck`: passed
- `npm run build`: passed
- `npm test -- responsibility-center --runInBand`: passed, 7 tests
- `npm test -- --runInBand`: passed, 20 suites / 109 tests
- `npm run db:migrate:local`: applied `20260716090000_refactor_responsibility_center_classification_types` locally before the migration was compressed. Local Prisma migration metadata must be repaired once because the temporary follow-up migration was removed.

Frontend:

- `npm run lint`: passed with 7 unrelated existing warnings in Party Management and shared payment type dialog.
- `npm run build`: passed with network access enabled for Next.js Google Font fetching.

## Prisma Validation Result

Prisma schema validation passed.

Local migration execution started successfully and applied:

```text
20260716090000_refactor_responsibility_center_classification_types
```

Before shared-dev deployment, repair local-only migration metadata if the temporary follow-up migration was already applied, then rerun locally:

```sql
DELETE FROM "_prisma_migrations"
WHERE migration_name = '20260716062638_align_responsibility_center_updated_at_d_efaults';

UPDATE "_prisma_migrations"
SET checksum = 'a936b4ed9965bd33ca8e75cd5ddda0ea3acb4dc18defd2dc611e64783f082b86'
WHERE migration_name = '20260716090000_refactor_responsibility_center_classification_types';
```

This repair is only needed for local databases that already applied the temporary follow-up migration before the migration files were compressed.

```bash
npm run db:migrate:local
npm run db:validate:local
npm run db:generate:local
npm run typecheck
npm test -- responsibility-center --runInBand
```

Shared-dev deployment should wait until local migration history is clean.

## Known Limitations

- `category` and `financialType` remain on `ResponsibilityCenter` for compatibility.
- Custom Responsibility Center Type maintenance is not enabled in this phase. The backend now rejects custom type names that cannot map to a legacy compatibility category instead of silently storing them as `TEAM`.
- The migration creates responsibility center types from existing responsibility center rows. Existing companies with no responsibility centers must receive their default type rows through onboarding or the company bootstrap repair path before users create centers.
- Full multi-dimensional transaction assignment tables are not part of this phase.
- Frontend unit tests should be added after the frontend repository has an agreed test runner.

## Final Readiness State

```text
READY FOR LOCAL MIGRATION TEST
```

This is not yet marked ready for shared-dev deployment because the local Prisma migration prompt must be completed and verified first.

## Manual QA Checklist

1. Run migration locally or in shared-dev with the guarded workflow.
2. Run platform/company bootstrap if needed.
3. Open Responsibility Centers.
4. Confirm classifications load.
5. Select Classification and confirm Type filters.
6. Select Type and confirm code suggestion format such as `PC-BR-001`.
7. Manually edit code and confirm it is not overwritten.
8. Create a center.
9. Edit a center without changing code and confirm code remains unchanged.
10. Attempt duplicate code and confirm backend validation.
11. Attempt inactive parent selection after deactivation and confirm rejection.
12. Deactivate a parent and confirm descendants are deactivated.
13. Reactivate a parent and confirm descendants are reactivated.
14. Reactivate a sub-parent under an inactive parent and confirm the inactive ancestor path is also reactivated.

## Deployment Instructions

Backend:

```bat
cd /d I:\Gr8BooksNeo\apps\backend-shared-dev
git pull origin staging
npm ci
node scripts/run-with-env.cjs .env prisma migrate deploy
node scripts/run-with-env.cjs .env prisma generate
npm run build
pm2 restart gr8booksneo-backend-shared-dev --update-env
pm2 save
```

Frontend:

```bat
cd /d I:\Gr8BooksNeo\apps\frontend
git pull origin staging
npm ci
npm run build
pm2 restart gr8booksneo-frontend --update-env
pm2 save
```

## Post-Deployment Checks

```sql
SELECT code, name, status
FROM responsibility_center_classifications
ORDER BY id;

SELECT company_id, classification_id, name, code_prefix, status
FROM responsibility_center_types
ORDER BY company_id, classification_id, sort_order, name;

SELECT COUNT(*) AS unmapped_centers
FROM responsibility_centers
WHERE type_id IS NULL;
```

Expected:

- Four active classifications.
- Company-owned responsibility center types exist.
- `unmapped_centers = 0`.
