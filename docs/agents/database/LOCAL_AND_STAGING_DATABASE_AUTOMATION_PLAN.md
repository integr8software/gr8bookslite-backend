# Local And Staging Database Setup And Automation Plan

## Purpose

This document describes the current Gr8BooksLite local and staging database
setup, the recent permission architecture refactor, the mixed-data problem in
Neon staging, and the workflow we want to automate safely.

It is intended as a technical handoff for reviewing and improving the database
deployment process. It contains no database credentials.

## Current Environment Topology

```text
Developer machine
  -> backend .env
  -> local PostgreSQL

Render staging backend
  -> Render environment variables
  -> Neon staging PostgreSQL

Future production backend
  -> production hosting environment variables
  -> separate production PostgreSQL database
```

| Environment       | Database                     | Configuration source          | Allowed Prisma workflow                                |
| ----------------- | ---------------------------- | ----------------------------- | ------------------------------------------------------ |
| Local development | Local PostgreSQL             | Backend `.env`                | `migrate dev`, reset, seed, maintenance scripts        |
| Render staging    | Neon staging                 | Render environment variables  | Committed migrations through `migrate deploy`          |
| Production        | Separate production database | Hosting environment variables | Reviewed committed migrations through `migrate deploy` |

Local development and Neon staging must never share the same database.

## Repository And Runtime

- Backend: NestJS, Prisma, PostgreSQL, TypeScript
- Frontend: Next.js
- Staging host: Render
- Staging database: Neon PostgreSQL
- Prisma schema: `prisma/schema.prisma`
- Prisma migrations: `prisma/migrations`
- Prisma configuration: `prisma.config.ts`
- Current migration chain: 50 migrations as of June 11, 2026

Prisma uses:

```env
DATABASE_URL="<runtime or pooled PostgreSQL URL>"
DIRECT_URL="<direct PostgreSQL URL for migrations>"
```

For Neon, `DATABASE_URL` should use the pooled connection and `DIRECT_URL`
should use the direct connection.

## Local Safety Guardrails

All npm commands ending in `:local` use:

```text
node scripts/run-with-env.cjs .env ...
```

The wrapper:

- explicitly loads the backend `.env`,
- requires both `DATABASE_URL` and `DIRECT_URL`,
- rejects any host other than `localhost`, `127.0.0.1`, or `::1`,
- prevents accidentally running local destructive commands against Neon.

Local-only maintenance scripts also call `assertLocalDatabase()` before making
changes.

Important local commands:

```bash
npm run db:prepare:local
npm run db:migrate:local -- --name <migration_name>
npm run db:migrate:create:local -- --name <migration_name>
npm run db:status:local
npm run db:seed:local
npm run db:verify-permissions:local
```

The following commands destroy local data and must never target Neon:

```bash
npm run db:reset:local
npm run db:rebuild:local
```

## Staging Deployment Setup

Render currently receives Neon URLs from Render environment variables.

Recommended Render commands:

```text
Build Command:
npm ci --include=dev && npm run build

Pre-Deploy Command:
npm run db:migrate:staging && npm run db:verify:staging

Start Command:
npm run start:staging
```

`npm run db:migrate:staging` runs:

```bash
prisma migrate deploy
```

It does not load the local `.env`. It requires `APP_ENV=staging`, validates the
approved database fingerprint, uses the environment variables supplied by
Render, and only applies committed migrations. The verification command then
checks connectivity, migration status, and the permission architecture. The
separate start command validates the same staging identity and never runs
migrations.

Never run these against Neon staging:

```bash
prisma migrate dev
prisma migrate reset
prisma db push
```

## Permission Architecture Refactor

The permission architecture was substantially changed.

Current expected catalog:

| Table                 | Expected active rows | Code format                                             |
| --------------------- | -------------------: | ------------------------------------------------------- |
| `platform_modules`    |                   12 | descriptive lowercase slug, such as `cash-disbursement` |
| `platform_submodules` |                   65 | globally unique uppercase abbreviation, such as `COA`   |
| `permissions`         |                   65 | same abbreviation as its target submodule               |

Important architecture changes:

- Added `platform_submodules`.
- Added explicit `permissions.target_type`.
- Added `permissions.submodule_id`.
- Added `can_cancel` and `can_uncancel`.
- Retained legacy `can_delete` and `can_approve` columns for compatibility.
- Converted active submodule and permission codes to abbreviations.
- Kept module codes as descriptive lowercase slugs.
- Changed role writes so the backend validates existing catalog rows instead of
  creating or upserting modules and permissions.
- Removed retired legacy permission and submodule rows.

Examples:

| Module code             | Submodule name                | Submodule and permission code |
| ----------------------- | ----------------------------- | ----------------------------- |
| `maintenance`           | Chart of Accounts             | `COA`                         |
| `cash-disbursement`     | Cash Advance                  | `CA`                          |
| `cash-disbursement`     | Petty Cash Fund Replenishment | `PCFR`                        |
| `system-administration` | User Role                     | `UR`                          |

Collision-safe codes include:

- Discount Management: `DSM`
- Provisional Receipt: `PVR`
- BIR Reports: `BIRR`
- Service Invoice: `SVI`

## Current Mixed-Data Problem In Neon Staging

Neon staging may contain a mixture of:

- old module and permission rows,
- newer submodule rows,
- old long permission codes,
- new abbreviated permission codes,
- duplicate or retired catalog entries,
- role assignments referencing old permission IDs,
- membership overrides referencing old permission IDs,
- schema columns from different stages of the refactor.

Applying only the latest application code does not automatically guarantee that
old data is clean. The committed migrations must be applied in order, and the
result must be verified before the new backend serves traffic.

The goal is not merely to make the schema compile. The goal is to preserve
valid staging data while making all permission catalog rows and references
consistent with the new architecture.

## Existing Permission Tools

### Local Catalog Rollback

The retired two-level permission catalog reset script is no longer part of the
database workflow. Use the user-sidebar reset API for presentation resets, or
restore a local database snapshot when the catalog itself needs rollback.

### Permission Architecture Verifier

The repository includes:

```bash
npm run db:verify-permissions:local
```

It checks:

- exactly 12 active modules,
- exactly 65 active submodules,
- exactly 65 active permissions,
- no retired submodules or permissions,
- valid permission targets,
- matching permission and submodule modules,
- no assignments to inactive permissions,
- delete-to-cancel migration consistency,
- action grants imply view,
- uppercase abbreviated submodule and permission codes,
- descriptive lowercase module codes,
- canonical `PCFR`, `PCA`, and `APV` mappings.

The verifier currently uses the local environment wrapper. A staging-safe,
read-only variant should be created for automation.

## Known Migration-History Risk

An older migration,
`20260610090000_align_cash_disbursement_role_permissions`, was corrected after
it had already been applied locally. Prisma can report that the migration was
modified after application when running `migrate dev`.

This must be reviewed before relying on automatic staging deployment.

Preferred long-term rule:

- Never modify an already-applied migration.
- Add a new forward-only corrective migration.
- Treat the migration folder as immutable history after it reaches a shared
  database.

Before automating Neon deployment, compare the checksums in Neon
`_prisma_migrations` with the committed migration files and decide how to
reconcile any drift without resetting staging.

## Safe Staging Reconciliation Options

### Option A: Fresh Neon Staging Database

Use this when staging business data can be discarded.

1. Create a new Neon database or branch.
2. Point a temporary backend deployment to it.
3. Run all committed migrations using `prisma migrate deploy`.
4. Run seeds that are explicitly approved for staging.
5. Run read-only permission verification.
6. Smoke-test authentication, company switching, roles, and access control.
7. Switch staging to the new database.

This is the cleanest option because it proves that the migration chain can build
the complete database from zero.

### Option B: Preserve Existing Neon Staging Data

Use this when staging users, companies, roles, and other records must remain.

1. Stop or pause backend writes.
2. Create a Neon restore point, branch, or `pg_dump` backup.
3. Record baseline counts for critical tables.
4. Run `prisma migrate status`.
5. Resolve migration-history drift before applying anything.
6. Run `prisma migrate deploy`.
7. Run a staging-safe, read-only permission verifier.
8. Run targeted corrective SQL only through a reviewed forward migration.
9. Compare before-and-after counts.
10. Smoke-test the application.
11. Resume backend writes.

Do not use the local destructive permission reset for this option.

## Proposed Automated Staging Pipeline

The staging pipeline should be separate from normal application startup. A
failed migration or verification should prevent the new application version
from receiving traffic.

Proposed stages:

```text
1. Validate
   -> npm ci --include=dev
   -> prisma validate
   -> typecheck
   -> tests
   -> backend build

2. Migration preflight
   -> confirm APP_ENV=staging
   -> confirm database host is an approved Neon staging host
   -> prisma migrate status
   -> detect modified migration checksums
   -> capture critical before-counts

3. Backup / restore point
   -> create Neon branch or restore point
   -> record backup identifier

4. Deploy migrations
   -> prisma migrate deploy

5. Verify
   -> run staging-safe read-only permission verifier
   -> run general database invariant checks
   -> compare critical counts

6. Deploy application
   -> start new backend version
   -> smoke-test health, auth, role creation, and permission catalog

7. Rollback decision
   -> restore Neon branch/backup if migration or smoke test fails
```

## Proposed New Scripts

These scripts do not exist yet and should be reviewed before implementation:

```text
db:status:staging
  Read-only migration status using hosting-provided staging URLs.

db:verify-permissions:staging
  Read-only permission architecture verification.

db:preflight:staging
  Confirms APP_ENV=staging, approved Neon host, migration status, and baseline
  counts. Must refuse production and local databases.

db:migrate-and-verify:staging
  Runs preflight, migrate deploy, and read-only verification. Must not contain
  destructive reset behavior.

db:audit-migration-checksums:staging
  Compares committed migration checksums with `_prisma_migrations`.
```

Recommended safety requirements:

- Require `APP_ENV=staging`.
- Require an allowlisted Neon project/database identifier.
- Reject local and production database identifiers.
- Never print full connection strings.
- Never automatically run reset, drop, truncate, or delete commands.
- Use transactions for corrective data migrations where practical.
- Abort on unexpected row-count decreases.
- Save a machine-readable verification report.

## Suggested Critical Baseline Counts

Capture these before and after staging migration:

```sql
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM companies;
SELECT COUNT(*) FROM memberships;
SELECT COUNT(*) FROM company_roles;
SELECT COUNT(*) FROM company_role_permissions;
SELECT COUNT(*) FROM membership_permissions;
SELECT COUNT(*) FROM platform_modules;
SELECT COUNT(*) FROM platform_submodules;
SELECT COUNT(*) FROM permissions;
SELECT COUNT(*) FROM company_modules;
SELECT COUNT(*) FROM form_signatory_setups;
```

Expected permission catalog result:

```text
Active modules: 12
Active submodules: 65
Active permissions: 65
Inactive submodules: 0
Inactive permissions: 0
```

## Rollback Requirements

Automation is not safe without a tested rollback procedure.

Before migration:

- create a Neon branch, restore point, or backup,
- record the exact Git commit and migration list,
- record critical row counts,
- pause writes if the migration changes shared data.

If verification fails:

- do not start the new backend version,
- keep logs and verification output,
- restore from the recorded Neon recovery point or switch back to the previous
  Neon branch,
- investigate and create a new forward migration.

Avoid trying to manually reverse complex data migrations during an incident.

## Questions For Architecture Review

1. How should the separate Render pre-deploy migration job automate database
   backups and post-migration verification?
2. Should Neon staging use a fresh database/branch per major refactor?
3. What is the safest way to reconcile an already-applied migration whose SQL
   checksum changed?
4. How should we automate Neon restore-point or branch creation before
   migrations?
5. Should the permission verifier be converted into a generic environment-safe
   read-only command?
6. Which row-count decreases should block deployment automatically?
7. How should secrets and approved Neon database identifiers be represented in
   Render?
8. Should corrective permission cleanup be a Prisma migration, a one-time
   deployment job, or both?
9. How can the pipeline prove that all role grants and membership overrides
   still reference valid permissions?
10. What rollback and smoke-test strategy is appropriate for Render plus Neon?

## Ready-To-Send Prompt

```text
Please review the attached Local And Staging Database Setup And Automation Plan
for a NestJS + Prisma + PostgreSQL application deployed on Render with Neon
staging.

We recently refactored the permission architecture and Neon staging may contain
mixed old and new data. We want to automate safe staging migrations without
resetting or losing users, companies, memberships, roles, grants, and
overrides.

Please:
1. identify risks or incorrect assumptions,
2. recommend a production-quality Render + Neon migration pipeline,
3. propose safe preflight, checksum-audit, backup, verification, and rollback
   scripts,
4. explain how to handle the already-applied migration checksum drift,
5. recommend whether staging should be reconciled in place or replaced with a
   fresh Neon branch,
6. provide an incremental implementation plan with example commands and
   guardrails.

Do not recommend prisma migrate reset or prisma db push against staging.
```
