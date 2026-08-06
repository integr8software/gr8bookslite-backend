# Current Database Architecture Analysis

**Project:** Gr8Books Neo backend  
**Audit date:** June 11, 2026  
**Scope:** Current implementation analysis only. No schema, migration, script, seed, application, or database changes were made.

## Executive Summary

The backend uses NestJS, Prisma, and PostgreSQL. Local database commands are substantially safer than the hosted-environment commands because local scripts pass through `scripts/run-with-env.cjs`, which refuses non-local database hosts. Shared development commands and the generic deployment migration command do not have equivalent environment identity checks.

The permission architecture is in the middle of a significant improvement. The database now separates platform modules, platform submodules, permissions, role grants, and user overrides. Current submodule and permission codes are already intended to use abbreviations such as `COA`, `PCA`, and `PCFR`, while module codes remain descriptive slugs such as `cash-disbursement`. However, compatibility fields, old actions, legacy aliases, seed strings, frontend mappings, and a dense recent migration chain mean the refactor still needs careful validation before production.

The most important current risks are:

1. An applied migration was previously reported as modified after application.
2. Shared development, staging, and production commands lack strong database identity protections.
3. Deployment migrations are coupled to application startup.
4. Environment files contain real operational credentials and duplicate configuration, increasing secret and configuration-drift risk.
5. Permission behavior is distributed across database migrations, backend constants/services/guards, and frontend maps.

## 1. Project Overview

### Technology Stack

| Area | Current implementation |
|---|---|
| Backend framework | NestJS |
| Runtime/language | Node.js and TypeScript |
| ORM | Prisma |
| Database provider | PostgreSQL |
| Configuration | Nest `ConfigModule`, process environment variables, `.env` files, `dotenv-cli`, and a custom local wrapper |
| Migrations | Versioned Prisma SQL migrations in `prisma/migrations` |
| Seeds | Prisma seed entry point using TypeScript |
| Hosted staging database | Documented/configured as Neon PostgreSQL through hosted environment variables |

### Backend Startup

The normal development startup path is:

```text
npm run dev
  -> generate Prisma client using .env through run-with-env.cjs
  -> load .env through run-with-env.cjs
  -> nest start --watch
  -> src/main.ts
  -> create AppModule
  -> configure global validation, filters, CORS, versioning, and API prefix
  -> listen on PORT or 3000
```

`AppModule` registers `ConfigModule.forRoot({ isGlobal: true })`. In a normal direct Nest startup, this allows Nest configuration to read `.env`; most database-specific local commands instead explicitly load `.env` before starting Prisma or Nest.

`src/main.ts`:

- Creates the Nest application with raw-body support.
- Applies common application configuration.
- Generates OpenAPI configuration.
- Listens on `PORT`, defaulting to `3000`.

The production-style startup path is:

```text
npm run build
npm run db:migrate:deploy
npm run start:prod
```

`start:prod` executes `node dist/src/main.js`.

The documented Render start command currently runs:

```text
npm run db:migrate:deploy && npm run start:prod
```

This applies migrations before every hosted application start.

### Prisma Configuration

`prisma.config.ts` defines:

- Schema path: `prisma/schema.prisma`
- Migration path: `prisma/migrations`
- Seed command: `ts-node prisma/seed.ts`
- Datasource URL: `DATABASE_URL`
- Direct datasource URL: `DIRECT_URL`
- Prisma engine: classic

The Prisma schema declares PostgreSQL as its provider. The direct connection is supplied through Prisma configuration rather than directly in the datasource block.

### Migration Strategy

The repository uses committed Prisma SQL migrations. There are currently **52 migration directories**. Local migration creation uses `prisma migrate dev`; hosted application uses `prisma migrate deploy`.

### Seeding Strategy

`prisma/seed.ts`:

1. Asserts that the target database is local.
2. Seeds subscription plans and related reference data.
3. Seeds or updates a super-administrator account when the required environment values exist.

The current seed is intentionally local-only.

## 2. Environment Setup Analysis

No secret values are included in this report.

### Current Environment Files

| Environment | File/source | Database target | Purpose | Selection method |
|---|---|---|---|---|
| Local | `.env` | Local PostgreSQL on `localhost`, database `gr8booksneo_dev` | Primary developer database | Loaded by `run-with-env.cjs .env` and normal Nest configuration |
| Shared development | `.env.shared-dev` | Remote VPS PostgreSQL, database `gr8booksneo_shared_dev` | Shared developer integration environment | Loaded directly with `dotenv -e .env.shared-dev` |
| Staging | No `.env.staging` file | Hosted/cloud PostgreSQL, documented as Neon | Hosted pre-production testing | Render environment variables |
| Production | No `.env.production` file | Intended separate production PostgreSQL | Live application | Expected hosted environment variables; no repository-specific workflow is currently defined |
| Example | `.env.example` | Local PostgreSQL example | Developer setup template | Manually copied/configured |

### Environment Selection

Local scripts use:

```text
node scripts/run-with-env.cjs .env <command>
```

Shared development scripts use:

```text
dotenv -e .env.shared-dev -- <command>
```

Hosted staging and production commands use whatever environment variables are present in the hosting process. The generic `db:migrate:deploy` script does not load a named environment file.

### Environment Observations

- `.env` and `.env.shared-dev` contain real operational credentials. They are ignored by Git, but they remain sensitive local files.
- `.env.shared-dev` duplicates a large amount of non-database configuration from `.env`, which can drift.
- `.env.example` defines `APP_ENV`, but the inspected `.env` and `.env.shared-dev` files do not.
- `NODE_ENV=development` does not distinguish local from shared development.
- There is no required environment identity such as `APP_ENV=local`, `APP_ENV=shared-dev`, `APP_ENV=staging`, or `APP_ENV=production`.
- Hosted environment correctness depends on manual platform configuration.

## 3. Package Scripts Audit

“Safe” below means safe relative to accidental database targeting. It does not mean risk-free.

| Script | Environment | Purpose | Safe? |
|---|---|---|---|
| `build` | None/database-independent | Compile Nest application | Yes |
| `dev` | Local | Generate client and start watch server | Yes; local host wrapper |
| `dev:shared` | Shared development | Generate client and start against shared DB | Caution; no shared identity guard |
| `dev:debug` | Local | Start local server with debugger | Yes; local host wrapper |
| `dev:clean` | Local | Remove TypeScript build cache and start local dev | Yes; database path inherits `dev` safety |
| `start` | Process environment | Start Nest directly | Caution; implicit environment |
| `start:prod` | Process environment | Start compiled backend | Caution; environment correctness is external |
| `postinstall` | Local file or process environment | Generate Prisma client | Caution; behavior changes if `.env` exists |
| `db:generate:local` | Local | Generate Prisma client | Yes; local host wrapper |
| `db:generate:shared` | Shared development | Generate Prisma client | Caution; direct dotenv loading |
| `db:validate:local` | Local | Validate Prisma schema | Yes |
| `db:format` | Local file loaded | Format Prisma schema | Mostly safe; misleading environment coupling |
| `db:migrate:local` | Local | Create/apply development migrations | Yes for target selection; migration-history risks remain |
| `db:migrate:create:local` | Local | Create migration without applying it | Yes for target selection |
| `db:migrate:deploy` | Process environment | Apply committed migrations | **Unsafe without external controls** |
| `db:status:local` | Local | Inspect migration status | Yes |
| `db:status:shared` | Shared development | Inspect migration status | Read-only, but no shared identity guard |
| `db:reset:local` | Local | Force-reset local schema and data | Destructive but locally guarded |
| `db:rebuild:local` | Local | Reset, generate, and seed local database | Destructive but locally guarded |
| `db:prepare:local` | Local | Format, validate, and generate | Yes |
| `db:seed:local` | Local | Run local seed | Yes; wrapper and seed assertion |
| `db:delete-user-owned-data:local` | Local | Delete selected user-owned data | Destructive but locally guarded and scoped |
| `db:backfill-head-offices:local` | Local | Preview/apply head-office backfill | Yes; local-only and apply flag |
| `db:verify-permissions:local` | Local | Verify permission catalog | Yes; read-only local verification |
| `db:studio:local` | Local | Open Prisma Studio | Caution; writable UI, but locally guarded |
| `db:studio:shared` | Shared development | Open Prisma Studio on shared DB | **High caution; writable shared UI** |
| `format` | None | Format TypeScript | Yes |
| `lint:check` | None | Check lint | Yes |
| `lint` | None | Fix lint findings | Yes; modifies source only |
| `openapi:generate` | None | Build and generate OpenAPI | Yes |
| `test`, `test:watch`, `test:cov`, `test:debug`, `test:e2e` | Test/process environment | Run tests | Depends on test environment configuration |
| `typecheck`, `typecheck:clean` | None | Type-check source | Yes |

### Duplicated or Confusing Scripts

- Local and shared scripts implement environment loading differently.
- `db:format` loads `.env` even though schema formatting should not require a database connection.
- `start` and `start:prod` do not communicate which environment they target.
- `db:migrate:deploy` is generic and does not identify staging or production.
- `postinstall` uses `.env` if it exists; a stray `.env` in CI or hosting can alter behavior.

### Missing Scripts

There are no explicit guarded scripts for:

- Shared development migration deployment
- Staging migration status/deployment/verification
- Production migration status/deployment/verification
- Hosted database preflight checks
- Hosted backups before risky migrations
- Hosted permission-catalog verification
- Read-only shared database inspection distinct from writable Prisma Studio

The absence of a shared migration command may be intentional, but the intended workflow is not enforced.

## 4. Database Workflow Analysis

### Creating Migrations

Current local workflow:

```text
edit prisma/schema.prisma
npm run db:migrate:create:local -- --name <migration-name>
review generated SQL
npm run db:migrate:local
```

`db:migrate:local` uses `prisma migrate dev`, which may create and apply migrations based on schema drift. Migrations should be reviewed before being committed.

### Applying Migrations Locally

```text
npm run db:migrate:local
```

The local wrapper requires both `DATABASE_URL` and `DIRECT_URL` to point to localhost-style hosts.

### Applying Migrations to Shared Development

There is no explicit package script for applying committed migrations to shared development. Existing shared commands support generation, status, Studio, and starting the application. Therefore, the exact shared migration deployment process is currently unclear or manual.

Shared development should not use `prisma migrate dev`, because a shared database is not an appropriate place to create migration history.

### Applying Migrations to Staging

The documented Render process runs:

```text
npm run db:migrate:deploy && npm run start:prod
```

This applies all pending committed migrations to the database selected by Render environment variables.

### Applying Migrations to Production

A separate production database is intended, but there is no production-specific script or repository-enforced environment check. The generic deploy command would use whichever database URL is present.

### Seeding Data

Current seed workflow:

```text
npm run db:seed:local
```

The seed is local-only. It seeds:

- Subscription plans, prices, usage prices, discount tiers, and plan module keys
- A super-administrator account when configured

The seed combines reference/catalog data with privileged-account bootstrap behavior.

Some subscription `moduleKey` strings still use older descriptive/compound naming. They are plain strings rather than foreign keys to the platform permission catalog, so they can drift independently.

### Resetting the Database

```text
npm run db:reset:local
npm run db:rebuild:local
```

Both are destructive. The package scripts protect them by loading `.env` through the localhost-only wrapper.

The permission catalog also has a local preview/reset maintenance script with an explicit confirmation mechanism.

### Current Workflow Risks

- An applied migration, `20260610090000_align_cash_disbursement_role_permissions`, was previously reported by Prisma as modified after application. Applied migrations must be immutable.
- The recent permission refactor is spread across a dense sequence of migrations. There are two migration directories sharing the `20260610113000` timestamp prefix; full directory names remain unique, but ordering is less obvious.
- Documentation counts are stale in places: this audit found 52 migration directories.
- The local migration status command selected the correct local database during this audit but failed with a Prisma schema-engine error, so live status was not verified.
- There is no automated hosted backup, preflight, post-deploy verification, or rollback workflow.
- Hosted migration deployment is coupled to application startup.

## 5. Migration Safety Review

### `scripts/run-with-env.cjs`

The wrapper:

1. Reads a requested environment file.
2. Loads its values into the child process environment.
3. Requires both `DATABASE_URL` and `DIRECT_URL`.
4. Parses both URLs.
5. Rejects either URL unless its host is `localhost`, `127.0.0.1`, or `::1`.
6. Resolves supported local command binaries and spawns the requested command.

### What It Protects

- It prevents package scripts that use the wrapper from accidentally running against a remote database.
- It protects local reset, rebuild, seed, maintenance, migration, Studio, and development commands.
- It validates both pooled/application and direct Prisma URLs for local commands.

### What It Does Not Protect

- Shared development scripts bypass it.
- `db:migrate:deploy` bypasses it.
- It does not validate database names, usernames, schemas, projects, branches, or environment identities.
- It does not distinguish shared development from staging or production.
- It does not verify backups, migration checksums, drift, or pending destructive SQL.
- It cannot prevent developers from invoking Prisma directly.
- Individual TypeScript maintenance scripts may only assert `DATABASE_URL` when invoked outside the package wrapper.

### Other Safety Findings

- No `db push` package script was found. This is positive because schema changes are expected to be represented by migrations.
- Local reset scripts are clearly named and guarded.
- Shared Prisma Studio is convenient but provides a writable interface to shared data.
- No production safeguards are encoded in package scripts.
- No automated migration linter or destructive-SQL approval gate was found.

## 6. Database Architecture Review

### General Structure

The Prisma schema currently contains approximately:

- 29 models
- 20 enums
- 54 explicit indexes
- 30 unique constraints/declarations

The physical naming convention is generally consistent:

- Prisma models: singular `PascalCase`
- Prisma fields: `camelCase`
- PostgreSQL tables and mapped columns: `snake_case`

### Relationships and Tenancy

The core tenant hierarchy is:

```text
User
  -> Membership (user + company)
      -> MembershipUnitAccess
          -> CompanyUnit

Company
  -> CompanyUnit
  -> CompanyRole
  -> CompanyRolePermission
```

`Membership` uses a composite primary key of user and company. Unit access and role assignments provide additional branch-level context.

Owned child records often use cascading deletes. Historical or optional relationships commonly use `SetNull`.

Application queries and services enforce tenant context. No database-level PostgreSQL row-level security was found.

### Naming Consistency

The model/table mapping is generally strong. Remaining consistency concerns include:

- Permission-related legacy columns and action names remain alongside the new behavior.
- Some flexible string fields could be enums, while other domains already use enums.
- `SubscriptionPlanModule.moduleKey` is a free string and can diverge from platform module/permission identifiers.
- `AuditLog.platformModuleId` does not use an explicit snake-case mapping and should be reviewed for intent and consistency.

### Indexes and Constraints

The schema contains many useful indexes and composite unique constraints for tenant-scoped lookup and relationship integrity.

Important permission invariants involving nullable module/submodule targets rely on raw SQL migration constraints because Prisma cannot express every check constraint in its schema. These constraints must be preserved and verified during future refactors.

`PlatformSubmodule` has a composite unique declaration involving `id` and `moduleId`, even though `id` is already the primary key. This appears intended to support a composite relationship from `Permission`, but it adds complexity.

### Soft Delete and Status Patterns

There is no common `deletedAt` soft-delete pattern. Records are retained or hidden using:

- `isActive` booleans
- Status enums such as removed/canceled states
- Hard deletes with cascade behavior

This mixed strategy is workable but should be explicitly documented per model before production.

### Audit Fields and Timestamps

Most mutable business models have `createdAt` and `updatedAt`. Some event/history models have only creation timestamps, which may be intentional. Audit behavior is not completely uniform.

The recent audit-log migration removes unused columns. The remaining `platformModuleId` relationship and metadata-based audit information should be reviewed together to avoid maintaining two competing representations.

## 7. Permission Architecture Review

### Current Database Model

```text
PlatformModule
  -> PlatformSubmodule
      -> Permission
          -> CompanyRolePermission
          -> MembershipPermission
```

| Table/model | Current responsibility |
|---|---|
| `platform_modules` / `PlatformModule` | Global module catalog; descriptive module slugs |
| `platform_submodules` / `PlatformSubmodule` | Global submodule catalog; abbreviated submodule codes, names, routes, ordering |
| `permissions` / `Permission` | Permission target catalog, scope, context requirement, and code |
| `company_role_permissions` / `CompanyRolePermission` | Non-null role-level action grants |
| `membership_permissions` / `MembershipPermission` | Nullable per-user overrides that inherit when null |

### Current Code Convention

Current intended convention:

- Module code: descriptive lowercase slug, for example `cash-disbursement`
- Submodule code: uppercase abbreviation without module prefix, for example `COA`, `PCA`, `PCFR`
- Permission code: uppercase abbreviation aligned with the target submodule

The example future conversion from `chart-of-accounts` to `COA` has already been implemented in the current migration/catalog direction. Any shared, staging, or production database that has not applied the relevant migrations still requires migration.

Some collision-prone abbreviations have been expanded, including values such as `DSM`, `PVR`, `BIRR`, and `SVI`.

### Current Action Convention

Active actions are:

```text
view
create
update
cancel
uncancel
export
```

Legacy actions remain in code/schema compatibility surfaces:

```text
delete
approve
```

The backend currently forces legacy `DELETE` and `APPROVE` permissions to false when calculating effective access. Role payload handling retains compatibility fields, and delete-like input may map to cancel behavior.

### Backend Permission Flow

1. The backend-owned permission catalog is read by the role-management service.
2. Role create/update requests send `permissionCode` plus actions.
3. The service validates that each requested permission code exists.
4. Role grants are stored in `CompanyRolePermission`.
5. Company-level and unit-level role grants are combined.
6. Nullable membership overrides replace or inherit role values.
7. Effective permissions are represented internally as `CODE:action`.
8. `@Permissions(...)` metadata and `PermissionsGuard` call `AccessControlService.hasPermission`.

Only a limited number of controllers currently appear to use the permission decorator directly. This means catalog completeness does not automatically guarantee complete endpoint enforcement.

The role service contains some targeted legacy-code aliases, especially for recently changed cash-disbursement codes. It is not a universal legacy-code translator.

### Frontend Permission Flow

The frontend:

- Maintains `PermissionCodeByNavigationKey` in the sidebar registry.
- Keeps route/navigation keys descriptive while mapping them to abbreviated permission codes.
- Fetches the backend permission catalog for the user-role matrix.
- Sends role permissions using `permissionCode` and action arrays.
- Represents role selections in several UI paths as `CODE.action`.

The backend effective-permission representation uses `CODE:action`, while role-management UI values use `CODE.action`. This distinction is manageable but increases conversion and consistency risk.

### Permission Migration Impact

Any future permission code or action rename affects all of the following:

| Area | Required consideration |
|---|---|
| Database | Update catalog rows while preserving IDs and role/user relationships |
| Migrations | Never edit an already-applied migration; add a new forward migration |
| Backend catalog/service | Update constants, validation, compatibility aliases, and responses |
| Backend access control | Update effective permission generation and action handling |
| Guards/decorators | Update every protected endpoint requirement |
| Frontend sidebar | Update navigation-key-to-permission-code mapping |
| Frontend role UI | Update catalog assumptions, selection serialization, and mock/default data |
| Tests | Verify role grants, user overrides, endpoint enforcement, and navigation visibility |
| Seeds/reference data | Align free-form module keys or explicitly separate their meaning |

### Permission Architecture Risks

- The current codebase contains both new and legacy action concepts.
- Compatibility aliases may hide stale callers rather than reveal them.
- Database catalog migrations are recent and numerous.
- The frontend has a central mapping, but permission concepts also appear in role APIs, sidebar filtering, profile mapping, generated API types, and some older feature-specific permission strings.
- Empty enabled-module lists appear to bypass module filtering in access-control logic; the intended meaning should be confirmed.
- Subscription plan module keys are not relationally tied to the permission catalog.
- Endpoint guard coverage should be audited separately from UI visibility.

## 8. Data Flow Analysis

### Current/Intended Flow

```text
LOCAL
  create and test schema migrations
  seed disposable/reference test data
  |
  | commit reviewed migration files
  v
SHARED DEVELOPMENT
  integration testing with shared data
  |
  | apply the same committed migrations
  v
STAGING
  hosted deployment applies committed migrations
  |
  | promote the same application revision and migrations
  v
PRODUCTION
```

### What Uses Migrations

- Local schema development: `prisma migrate dev`
- Staging/hosted deployment: `prisma migrate deploy`
- Production should use `prisma migrate deploy`, although no production-specific guarded command exists
- Shared development should use deploy-only migrations, but the repository does not currently define that command

### What Uses `pg_dump`

Existing documentation describes using `pg_dump` to copy a hosted/Neon staging database down to a local database for debugging. This is a data restore workflow, not a migration workflow.

### What Should Never Happen

- Do not use local database dumps to overwrite shared development, staging, or production.
- Do not promote data upward as a substitute for migrations.
- Do not run `prisma migrate dev` against shared development, staging, or production.
- Do not run `prisma migrate reset` against any remote database.
- Do not edit migration SQL after it has been applied to any shared or hosted database.
- Do not restore production data locally without sanitization and access approval.
- Do not store database dumps or environment files in Git.
- Do not assume that a successful application start proves permission-catalog correctness.

## 9. Refactor Recommendations

### Critical

| Current problem | Proposed solution | Migration strategy | Risk |
|---|---|---|---|
| An applied migration was reported as modified | Restore the applied migration to its original checksum and create a new forward migration for any correction | Compare repository SQL with `_prisma_migrations`; never rewrite hosted history | Critical |
| Generic `db:migrate:deploy` can target any configured database | Add environment-specific wrappers that verify `APP_ENV`, host, database name/project, and an explicit confirmation token for production | Introduce wrappers first; keep actual SQL migrations unchanged | High |
| Hosted migrations run during app startup | Move migration deployment to a single pre-deploy/release job with backup, status, and verification steps | Change deployment orchestration after validating the release job in staging | High |
| Shared/staging/production database identities are not repository-enforced | Require explicit environment identity and database fingerprints | Roll out read-only preflight checks before enforcing writes | High |
| Permission endpoint enforcement may not cover every protected API | Audit every controller and add explicit guard requirements | Add tests first, then protect endpoints module by module | High |
| Real secrets and duplicate credentials exist in local environment files | Rotate exposed/stale credentials and centralize secret ownership | Rotate one integration at a time; verify deployments after each rotation | High |

### Recommended

| Current problem | Proposed solution | Migration strategy | Risk |
|---|---|---|---|
| Shared migration workflow is unclear | Add guarded `db:status:shared`, `db:migrate:deploy:shared`, and `db:verify:shared` workflows | Begin with status/verify, then enable deploy after backup testing | Medium |
| Permission legacy actions remain in schema and code | Define a deprecation plan for `delete` and `approve` | Measure callers, stop writes, migrate values if needed, then remove in a later release | Medium |
| Permission identifiers are duplicated across layers | Generate or validate frontend maps/backend constants from a canonical catalog artifact | Add a comparison check first; avoid changing live codes during adoption | Medium |
| Subscription plan `moduleKey` values can drift from platform catalog | Define whether these represent products, modules, or permissions; use a validated catalog or FK where appropriate | Backfill and validate existing values before adding constraints | Medium |
| Seed mixes reference data and privileged account bootstrap | Split reference seeding, local fixtures, and admin bootstrap into separate commands | Preserve current seed until replacement commands are verified | Medium |
| No hosted permission verifier command | Make the existing verifier environment-aware and read-only by default | Add staging read-only verification first | Low |
| No standard soft-delete policy | Document retention/deletion policy per model | Apply only to future model changes unless a business need requires migration | Medium |
| Audit model has potentially competing module references | Confirm intended audit representation and remove only truly unused paths | Backfill/verify before any column removal | Medium |

### Optional

| Current problem | Proposed solution | Migration strategy | Risk |
|---|---|---|---|
| Script naming is inconsistent | Adopt consistent `<operation>:<environment>` names | Add aliases, deprecate old names later | Low |
| `db:format` unnecessarily loads local DB config | Make schema formatting database-independent | Replace script after confirming Prisma config behavior | Low |
| Documentation has stale migration/catalog counts | Generate status sections or add a documentation verification checklist | Update docs during release preparation | Low |
| Shared Prisma Studio is easily writable | Prefer a read-only database user or SQL inspection workflow | Create read-only credentials before removing the current shortcut | Low |
| Permission UI uses dot syntax while backend uses colon syntax | Define a shared typed permission-key format or central conversion utility | Introduce utility and migrate callers incrementally | Low |

## 10. Final Architecture Proposal

This is a proposed target for later review, not an implementation performed by this audit.

### Proposed Environment Strategy

Every environment should have an explicit identity:

```text
APP_ENV=local
APP_ENV=shared-dev
APP_ENV=staging
APP_ENV=production
```

Each database operation wrapper should verify:

- `APP_ENV`
- PostgreSQL host
- Database/project/branch name
- Direct versus pooled URL expectations
- Whether the requested operation is allowed in that environment
- Production confirmation for write/destructive operations

Local environment files may remain local. Shared, staging, and production secrets should live in managed secret stores rather than copied environment files.

### Proposed Database Workflow

```text
Developer changes Prisma schema locally
  -> create migration with migrate dev --create-only
  -> review SQL and destructive changes
  -> apply/test locally
  -> run schema, permission, and application tests
  -> commit immutable migration
  -> CI validates migration history/checksums
  -> shared development deploy job applies migration
  -> staging release job backs up, applies, and verifies
  -> production release job requires approval, backs up, applies, and verifies
```

### Proposed Migration Workflow

- Use `migrate dev` only on local disposable development databases.
- Use `migrate deploy` for shared development, staging, and production.
- Never edit applied migrations.
- Add a migration-history/checksum check in CI.
- Scan migration SQL for destructive statements and require review.
- Run migrations once per release, separate from application startup.
- Run read-only post-migration verification, including permission-catalog checks.
- Document rollback as forward-fix migrations plus restore procedures where necessary.

### Proposed Seed Workflow

Separate commands by responsibility:

```text
db:seed:reference:local
db:seed:fixtures:local
db:bootstrap-admin:local
db:verify:permissions:<environment>
```

Reference-data changes required in hosted environments should normally be represented by reviewed migrations or idempotent, explicitly approved release tasks. Test fixtures and admin credentials should never be promoted as production seed data.

### Proposed Package Scripts

Example future command surface:

```text
db:preflight:local
db:preflight:shared
db:preflight:staging
db:preflight:production

db:migrate:create:local
db:migrate:apply:local
db:migrate:deploy:shared
db:migrate:deploy:staging
db:migrate:deploy:production

db:status:local
db:status:shared
db:status:staging
db:status:production

db:verify:local
db:verify:shared
db:verify:staging
db:verify:production

db:seed:reference:local
db:seed:fixtures:local
db:reset:local
```

Production deployment should require both an environment fingerprint match and an explicit approval mechanism.

### Proposed Safety Protections

1. Environment-specific database allowlists.
2. Mandatory `APP_ENV`.
3. Read-only preflight/status/verification commands.
4. Automatic backup before hosted destructive migrations.
5. CI migration checksum and destructive-SQL checks.
6. Immutable migration policy.
7. One migration runner per release.
8. Post-deploy permission-catalog verification.
9. Read-only shared-development inspection credentials.
10. Secret rotation and managed secret storage.

## Audit Notes and Verification Limits

- This report is based on repository inspection and existing project documentation.
- No database data, schema, migration, seed, package script, environment file, or application source was modified.
- Secret values were intentionally excluded.
- The local migration-status command selected `localhost/gr8booksneo_dev` but ended with a Prisma schema-engine error during this audit; current live migration status was therefore not independently confirmed.
- The migration directory count observed during this audit is 52.

