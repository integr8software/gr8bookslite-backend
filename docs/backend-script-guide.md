# Backend Script Guide

This guide lists the backend scripts that matter for daily development, shared-dev/staging deployment, SaaS plan repair, and company bootstrap repair.

Run commands from:

```bash
gr8bookslite-backend
```

## Environment Naming

| Environment | Env file/source | Common suffix |
|---|---|---|
| Local | `.env` | `:local` or `:current` |
| Shared Dev | `.env.shared-dev` | `:shared` |
| Staging | process environment | `:staging` |
| Production | process environment | `:production` |

`current` usually means local `.env`.

## Normal Local Startup

Use this when starting local backend development:

```bash
npm run dev
```

Equivalent:

```bash
npm run dev:local
```

This generates Prisma client and starts Nest in watch mode.

## Local Database Setup

Run migrations:

```bash
npm run db:migrate:local
```

Generate Prisma client:

```bash
npm run db:generate:local
```

Validate Prisma schema:

```bash
npm run db:validate:local
```

Check migration status:

```bash
npm run db:status:local
```

Open Prisma Studio:

```bash
npm run db:studio:local
```

Avoid `db:reset:local` unless you intentionally want to delete local data.

## Seeds vs Provisioning

There are two separate concepts.

### Full Local Seed

```bash
npm run db:seed:local
```

Use this for local development only. It seeds local reference data and local-only basics.

### Platform Provisioning

```bash
npm run db:provision
```

Equivalent local command:

```bash
npm run db:provision:current
```

Provisioning updates platform metadata:

- modules
- permissions
- module systems
- sidebar templates
- subscription plans
- subscription plan system links
- default COA templates

Provisioning does not repair old company-owned setup data.

## Recommended Local Repair Flow

Use this after pulling architecture changes or when old companies have missing sidebar/modules/company defaults.

```bash
npm run db:migrate:local
npm run db:generate:local
npm run db:provision
```

Then repair old legacy subscriptions that point to invalid zero-module plans.

Dry-run:

```bash
npm run db:repair:legacy-company-subscriptions:local -- --target-plan-code ACCOUNTING
```

Apply:

```bash
npm run db:repair:legacy-company-subscriptions:local -- --target-plan-code ACCOUNTING --apply
```

Use this instead if the companies should receive Accounting + Inventory:

```bash
npm run db:repair:legacy-company-subscriptions:local -- --target-plan-code ACCOUNTING_AND_INVENTORY --apply
```

Then run company bootstrap repair.

Audit:

```bash
npm run db:audit:company-bootstrap:local
```

Apply:

```bash
npm run db:repair:company-bootstrap:local -- --apply
```

Finally verify:

```bash
npm run db:verify:local
```

## Four Active SaaS Plans

The supported active plan catalog is:

| Scope | Plan code | Meaning |
|---|---|---|
| Onboarding | `ACCOUNTING` | Accounting only |
| Onboarding | `ACCOUNTING_AND_INVENTORY` | Accounting + Inventory |
| Additional Company | `ADDITIONAL_COMPANY_ACCOUNTING` | Accounting only |
| Additional Company | `ADDITIONAL_COMPANY_ACCOUNTING_AND_INVENTORY` | Accounting + Inventory |

Legacy plans such as `ACCOUNTING_TRADING` should not remain active after provisioning. Existing companies that still point to those legacy plans must be repaired with `db:repair:legacy-company-subscriptions:*`.

## Legacy Company Subscription Repair

Purpose:

Fix companies whose latest usable subscription points to an old plan that has `0` modules or `0` sidebar templates.

Local dry-run:

```bash
npm run db:repair:legacy-company-subscriptions:local -- --target-plan-code ACCOUNTING
```

Local apply:

```bash
npm run db:repair:legacy-company-subscriptions:local -- --target-plan-code ACCOUNTING --apply
```

Shared-dev dry-run:

```bash
npm run db:repair:legacy-company-subscriptions:shared -- --target-plan-code ACCOUNTING
```

Shared-dev apply:

```bash
npm run db:repair:legacy-company-subscriptions:shared -- --target-plan-code ACCOUNTING --apply
```

Staging dry-run:

```bash
npm run db:repair:legacy-company-subscriptions:staging -- --target-plan-code ACCOUNTING
```

Staging apply:

```bash
npm run db:repair:legacy-company-subscriptions:staging -- --target-plan-code ACCOUNTING --apply
```

This script writes a backup under:

```text
tmp/backups/
```

## Company Bootstrap Repair

Purpose:

Repair company-owned defaults for old companies created before newer module setup logic existed.

This can repair or audit:

- head office
- COA
- company default account mappings
- terms
- payment types
- discounts
- bank defaults
- subscription/sidebar runtime readiness
- transaction number sequence readiness
- form signatory readiness

It does not create materialized sidebar rows and does not restore `company_modules`.

Local audit:

```bash
npm run db:audit:company-bootstrap:local
```

Local apply:

```bash
npm run db:repair:company-bootstrap:local -- --apply
```

One company only:

```bash
npm run db:audit:company-bootstrap:local -- --company-id 44
```

Only specific handlers:

```bash
npm run db:audit:company-bootstrap:local -- --only coa,terms,payment-types
```

Apply only specific handlers:

```bash
npm run db:repair:company-bootstrap:local -- --only coa,company-default-accounts --apply
```

Skip specific handlers:

```bash
npm run db:repair:company-bootstrap:local -- --skip bank-defaults --apply
```

Shared-dev:

```bash
npm run db:audit:company-bootstrap:shared
npm run db:repair:company-bootstrap:shared -- --apply
```

Staging:

```bash
npm run db:audit:company-bootstrap:staging
npm run db:repair:company-bootstrap:staging -- --apply
```

On VPS when only `.env` exists:

```bash
node scripts/run-with-env.cjs .env ts-node prisma/scripts/repair-company-bootstrap.ts
node scripts/run-with-env.cjs .env ts-node prisma/scripts/repair-company-bootstrap.ts --apply
```

## Reference Seeds

Reference seed only:

```bash
npm run db:seed:reference:local
```

Shared:

```bash
npm run db:seed:reference:shared
```

Staging:

```bash
npm run db:seed:reference:staging
```

Use this when only reference data needs to be refreshed. For platform metadata, prefer `db:provision:*`.

## Super Admin Bootstrap

Create or update the local superadmin account:

```bash
npm run db:bootstrap-admin:local
```

This script is local-only. The database guard blocks it in shared-dev, staging, and production.

It reads:

```text
SUPERADMIN_EMAIL
SUPERADMIN_PASSWORD
SUPERADMIN_NAME
```

Behavior:

- if `SUPERADMIN_EMAIL` and `SUPERADMIN_PASSWORD` are both missing, it skips
- if only one is set, it fails
- if the user exists, it updates name, password, `SUPER_ADMIN` role, active status, and email verification
- if the user does not exist, it creates a new active superadmin

Example `.env`:

```text
SUPERADMIN_EMAIL=jcastillon@integr8.com.ph
SUPERADMIN_PASSWORD=your-local-password
SUPERADMIN_NAME=Platform Super Admin
```

Use this after a local rebuild or when your local superadmin password needs to be reset.

## Delete Local User-Owned Data

Delete one local user and the local tenant data tied to that account:

```bash
npm run db:delete-user-owned-data:local -- --email user@example.com
```

This script is local-only. It is intentionally destructive and guarded by `assertLocalDatabase`.

It can also read the email from:

```text
DELETE_USER_EMAIL
RESET_USER_EMAIL
```

Behavior:

- finds the user by email
- deletes companies connected to that user through memberships, onboarding draft provisioning, or `createdByUserId`
- deletes company-owned records through company cascade cleanup, including COA, default accounts, terms, payment types, discounts, bank accounts, roles, memberships, subscriptions, and sidebar preferences
- deletes the target user
- deletes related user accounts only when their memberships are fully inside the deleted companies
- skips related user accounts that still belong to other companies
- optionally deletes configured Supabase storage files

Delete storage objects only when the configured storage environment is safe:

```bash
npm run db:delete-user-owned-data:local -- --email user@example.com --delete-storage
```

Or:

```text
DELETE_USER_STORAGE_FILES=true
```

Do not use this for shared-dev, staging, or production cleanup. There is no remote package script for this on purpose.

## Verification

Verify local:

```bash
npm run db:verify:local
```

Verify shared-dev:

```bash
npm run db:verify:shared
```

Verify staging:

```bash
npm run db:verify:staging
```

Only verify migrations:

```bash
npm run db:verify-migrations:local
```

Only verify permission architecture:

```bash
npm run db:verify-permissions:local
```

## Build And Tests

Typecheck:

```bash
npm run typecheck
```

Unit tests:

```bash
npm test -- --runInBand
```

Build:

```bash
npm run build
```

Database guard tests:

```bash
node --test scripts/env/database-guard.test.cjs
```

Package script tests:

```bash
node --test scripts/env/package-scripts.test.cjs
```

## Shared Dev Deployment Flow

Typical shared-dev deployment:

```bash
git pull
npm ci
npm run db:migrate:shared
npm run db:provision:shared
npm run db:repair:legacy-company-subscriptions:shared -- --target-plan-code ACCOUNTING
npm run db:repair:legacy-company-subscriptions:shared -- --target-plan-code ACCOUNTING --apply
npm run db:audit:company-bootstrap:shared
npm run db:repair:company-bootstrap:shared -- --apply
npm run db:verify:shared
npm run build
pm2 restart gr8booksneo-backend-shared-dev --update-env
pm2 save
```

If shared-dev uses `.env` instead of `.env.shared-dev` on VPS, run the direct guarded commands:

```bash
node scripts/run-with-env.cjs .env prisma migrate deploy
node scripts/run-with-env.cjs .env ts-node prisma/scripts/provision-platform.ts
node scripts/run-with-env.cjs .env ts-node prisma/scripts/repair-legacy-company-subscriptions.ts --target-plan-code ACCOUNTING
node scripts/run-with-env.cjs .env ts-node prisma/scripts/repair-legacy-company-subscriptions.ts --target-plan-code ACCOUNTING --apply
node scripts/run-with-env.cjs .env ts-node prisma/scripts/repair-company-bootstrap.ts
node scripts/run-with-env.cjs .env ts-node prisma/scripts/repair-company-bootstrap.ts --apply
```

## Common Problems

### Navbar/sidebar empty

Check active subscription plans first:

```bash
npm run db:audit:company-bootstrap:local -- --only subscription-plan,sidebar-runtime
```

If the company points to a zero-module legacy plan, run:

```bash
npm run db:repair:legacy-company-subscriptions:local -- --target-plan-code ACCOUNTING --apply
```

Then logout/login.

### Module page opens but data is empty

Run company bootstrap audit:

```bash
npm run db:audit:company-bootstrap:local
```

Then repair:

```bash
npm run db:repair:company-bootstrap:local -- --apply
```

### Prisma asks to reset

Do not reset automatically. Check whether it is:

- migration checksum drift
- missing local migration file
- a failed migration
- schema drift caused by manual DB changes

For shared-dev/staging failed migrations, use `prisma migrate resolve` only after confirming whether the failed migration actually applied or rolled back.

## Safety Rules

- Run dry-run before `--apply`.
- Do not run destructive seeds in shared-dev/staging/production.
- Do not restore `company_modules`.
- Do not restore `company_module_exceptions`.
- Do not materialize sidebar rows.
- Keep company access derived from subscription plans.
- Keep company setup data repaired through company bootstrap handlers.
