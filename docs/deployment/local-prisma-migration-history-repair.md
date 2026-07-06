# Local Prisma Migration History Repair

## Case

Use this only when a local development database has the stale migration record:

```text
20260703120000_add_company_module_exceptions
```

and the source migration directory intentionally does not contain that migration
because the legacy company module exception architecture was retired.

Do not recreate:

- `company_module_exceptions`
- `company_modules`
- `CompanyModuleException` models
- `CompanyModuleException` enums

## Verification

Run this against the local development database before deleting anything:

```sql
SELECT migration_name, finished_at, rolled_back_at
FROM "_prisma_migrations"
WHERE migration_name IN (
  '20260703120000_add_company_module_exceptions',
  '20260704113000_remove_legacy_company_module_architecture'
)
ORDER BY migration_name;

SELECT
  to_regclass('public.company_module_exceptions') AS company_module_exceptions,
  to_regclass('public.company_modules') AS company_modules;
```

Proceed only if:

- `20260703120000_add_company_module_exceptions` exists
- `20260704113000_remove_legacy_company_module_architecture` exists and is
  finished
- both table checks return `NULL`

## Repair

```sql
DELETE FROM "_prisma_migrations"
WHERE migration_name = '20260703120000_add_company_module_exceptions';
```

## After Repair

```bash
npm run db:status:local
npm run db:migrate:local
npm run db:generate:local
npm run db:validate:local
npm run typecheck
npm test -- --runInBand
```

This is a local history repair only. Do not run it on shared-dev, staging, or
production without a separate migration-history review.
