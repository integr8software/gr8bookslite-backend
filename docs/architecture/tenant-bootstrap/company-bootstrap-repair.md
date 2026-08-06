# Company Bootstrap Repair

## Overview

Company bootstrap repair is the guarded maintenance path for old tenant records that were created before newer module setup logic existed.

It replaces one-off repair scripts with one company-scoped repair command.

The architecture stays separated:

- Platform provisioning owns global metadata.
- Company bootstrap owns tenant/company-owned defaults.
- Runtime access/sidebar remains derived from subscription plans and user preference deltas.

## Platform Provisioning

Platform provisioning creates shared metadata:

- modules
- permissions
- subscription plans
- subscription plan systems
- module systems
- module system modules
- module sidebar templates
- default Chart of Accounts templates
- reference data

It does not create tenant-owned module setup rows for every existing company.

## Company Bootstrap

Company bootstrap repair handles company-owned defaults:

- head office/unit
- Chart of Accounts
- company default account mappings
- terms
- payment types
- discounts
- bank masterfile defaults
- transaction number sequence audit
- form signatory audit
- runtime sidebar readiness audit

The repair script is:

- dry-run by default
- write-enabled only with `--apply`
- company-scoped
- idempotent
- guarded by the database guard
- backup-producing before apply

## Commands

Local audit:

```bash
npm run db:audit:company-bootstrap:local
```

Local repair:

```bash
npm run db:repair:company-bootstrap:local -- --apply
```

Shared-dev audit:

```bash
npm run db:audit:company-bootstrap:shared
```

Shared-dev repair:

```bash
npm run db:repair:company-bootstrap:shared -- --apply
```

Staging audit:

```bash
npm run db:audit:company-bootstrap:staging
```

Staging repair:

```bash
npm run db:repair:company-bootstrap:staging -- --apply
```

If the VPS deployment only has `.env`, use:

```bash
node scripts/run-with-env.cjs .env ts-node prisma/scripts/repair-company-bootstrap.ts
```

Apply:

```bash
node scripts/run-with-env.cjs .env ts-node prisma/scripts/repair-company-bootstrap.ts --apply
```

## Options

Limit to one company:

```bash
npm run db:audit:company-bootstrap:local -- --company-id 44
```

Run only selected handlers:

```bash
npm run db:audit:company-bootstrap:local -- --only coa --only discounts
```

Skip selected handlers:

```bash
npm run db:repair:company-bootstrap:local -- --skip bank-defaults --apply
```

Comma-separated values are also accepted:

```bash
npm run db:audit:company-bootstrap:local -- --only coa,terms,payment-types
```

## Handlers

| Handler | Mode | Purpose |
|---|---|---|
| `subscription-plan` | Audit | Checks latest usable subscription plan has active modules and sidebar templates. |
| `head-office` | Repair | Creates missing `HEAD-OFFICE` unit from company profile. |
| `admin-access` | Audit | Checks admin memberships and unit access. |
| `coa` | Repair | Seeds COA only when company has zero `chart_accounts`. |
| `company-default-accounts` | Repair | Creates missing default account mappings from existing COA rows. |
| `terms` | Repair | Seeds default terms only when no active terms exist. |
| `payment-types` | Repair | Seeds default payment types only when no active payment types exist. |
| `discounts` | Repair | Seeds default discounts only when no active discounts exist. |
| `bank-defaults` | Repair | Seeds bank defaults only when no bank accounts exist. |
| `transaction-number-sequences` | Audit | Reports missing sequence setup; no safe default helper exists yet. |
| `form-signatories` | Audit | Reports missing setup; no safe default helper exists yet. |
| `sidebar-runtime` | Audit | Verifies sidebar can be derived from subscription plan metadata. |

## Deduplication Rules

The repair does not blindly insert defaults.

- COA is seeded only if `chart_accounts` count is zero.
- Company default account mappings are inserted only when the natural key is missing.
- Terms are seeded only if no active terms exist.
- Payment types are seeded only if no active payment types exist.
- Discounts are seeded only if no active discounts exist.
- Bank defaults are seeded only if no bank accounts exist.
- Sidebar handler never creates sidebar rows.

This prevents the old table-bloat problem where default records were copied unnecessarily.

## What This Does Not Do

This repair does not:

- restore `company_modules`
- restore `company_module_exceptions`
- restore `platform_module_sidebar_items`
- create materialized user sidebar rows
- overwrite user-customized rows
- reset or drop the database
- change runtime entitlement architecture
- change frontend behavior

## Backups

Before `--apply`, the script writes a JSON backup/report to:

```text
tmp/backups/company-bootstrap-repair-<timestamp>.json
```

The backup contains per-company handler snapshots. It is meant for audit and rollback planning, not automatic rollback.

## Adding Future Handlers

Add future module defaults by registering a handler in:

```text
prisma/company-bootstrap/company-bootstrap.registry.ts
```

Each handler must provide:

- `key`
- `label`
- `inspect(companyId, tx)`
- optional `backup(companyId, tx)`
- optional `apply(companyId, tx)`

Rules for new handlers:

- inspect must be read-only
- apply must be idempotent
- apply must be company-scoped
- apply must insert only missing records
- apply must not overwrite company-edited data
- apply must not delete data

## Example Output

Dry-run:

```text
Company bootstrap repair (dry-run).
Companies: 41
Handlers: subscription-plan, head-office, admin-access, coa, ...

companyId  companyName     handler        status    applied  summary
44         Test Account    coa            missing   false    Company has no chart accounts.
44         Test Account    terms          ok        false    Terms exist.
44         Test Account    sidebar-runtime ok       false    Runtime sidebar can be derived from plan metadata.
```

Apply:

```text
Company bootstrap repair (apply).
Backup written to tmp/backups/company-bootstrap-repair-...

companyId  companyName     handler        status  applied  summary
44         Test Account    coa            ok      true     Company has no chart accounts. -> Company COA exists.
```

