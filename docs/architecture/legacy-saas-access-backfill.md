# Legacy SaaS Access Backfill

## Overview

Some companies were created before runtime access moved to strict SaaS plan
entitlements. Those companies can still have valid users, memberships, company
context, and branch context, but resolve an empty sidebar because the current
runtime source of truth is missing.

Runtime access now depends on:

```text
Company
  -> CompanySubscription
  -> SubscriptionPlan
  -> SubscriptionPlanSystem
  -> ModuleSystem
  -> ModuleSystemModule
  -> Module
```

The sidebar builder uses the latest usable company subscription to resolve
enabled modules and module-system sidebar templates. Legacy companies without a
usable `company_subscriptions` row therefore authenticate successfully but
resolve `enabledModules: []` and no sidebar links.

## What Was Added

Two operational scripts were added:

```bash
npm run db:audit-legacy-saas-access:current
npm run db:backfill-legacy-saas-access:current
```

Environment-specific variants are available for `shared`, `staging`, and
`production`.

The audit script is read-only. It reports companies/admin scopes with:

- no usable company subscription
- usable subscription whose plan has no active module-system modules
- usable subscription whose plan has no module-system sidebar template
- no active branch/unit records
Materialized sidebar rows are reported only as diagnostic counts. They are not
required for normal runtime sidebar rendering.

The backfill script is dry-run by default. Apply mode requires `--apply`:

```bash
npm run db:backfill-legacy-saas-access:staging -- --apply
```

## Default Plan

The default backfill plan is `ACCOUNTING_TRADING`, matching the existing active
onboarding SaaS seed.

To use a different plan:

```bash
npm run db:backfill-legacy-saas-access:staging -- --plan-code ACCOUNTING --apply
```

or set:

```text
LEGACY_SAAS_DEFAULT_PLAN_CODE=ACCOUNTING
```

The selected plan must be active, have `ONBOARDING` scope, and contain active
module-system modules. If not, the script stops and asks you to provision
platform metadata first.

## Backfill Behavior

Apply mode performs only safe repairs:

- creates a missing usable `company_subscriptions` row for affected companies
- remaps the latest usable subscription when its legacy plan has no
  module-system entitlements/templates
- uses the selected active SaaS plan
- sets the new subscription to `TRIALING`
- uses the plan's monthly price when available

It does not:

- hardcode frontend sidebar items
- bypass permission checks
- change route guards
- modify existing usable subscriptions
- modify existing usable subscriptions that already resolve modules/templates
- overwrite customized sidebar rows
- materialize default sidebar rows
- create branch/unit records
- create or alter role permission records

## Database Guard

Audit runs as a verification operation.

Backfill runs as a safe infrastructure operation:

- local: allowed
- shared-dev: allowed
- staging: allowed
- production: allowed only with `ALLOW_PRODUCTION_SAFE_SEED=true`

Production example:

```bash
ALLOW_PRODUCTION_SAFE_SEED=true \
npm run db:backfill-legacy-saas-access:production -- --apply
```

## Recommended Staging Repair Flow

```bash
npm run db:provision:staging
npm run db:audit-legacy-saas-access:staging
npm run db:backfill-legacy-saas-access:staging
npm run db:backfill-legacy-saas-access:staging -- --apply
npm run db:audit-legacy-saas-access:staging
npm run db:verify-permissions:staging
```

`db:provision:staging` should run first so subscription plans, module systems,
modules, and sidebar templates exist before the backfill chooses a plan.

## Runtime Regression

A regression test now verifies that a legacy company admin with:

- valid company context
- valid branch context
- valid SaaS plan subscription
- empty custom/materialized sidebar rows

still resolves non-empty sidebar items from plan-derived module-system
templates.

## Remaining Manual Cases

The script reports but does not automatically fix these cases:

- companies with no active branch/unit records
- companies with an existing usable subscription whose plan has no modules
- companies with an existing usable subscription whose plan has no sidebar
  template

Those indicate platform metadata or company setup problems. Run provisioning
first, then decide whether the company's selected plan should be changed through
the billing/subscription workflow.
