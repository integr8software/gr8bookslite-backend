# Platform Provisioning Review

# Overview

Platform provisioning is the backend-owned workflow that prepares required
platform infrastructure data after migrations.

The final implementation is intentionally direct:

```ts
await seedModules();
await seedModuleSystems();
await seedUserSidebars();
```

This provisions module and permission catalog data, module systems, sidebar
templates, and missing user sidebar rows for active memberships. It does not run
local fixtures, reset data, delete user-owned records, or overwrite customized
sidebars.

The provision runner records a singleton `platform_versions` row after a
successful run. This is kept because it gives operations a simple way to confirm
which platform provision version was applied without adding a larger version
engine.

---

# Final Deployment Flow

Recommended shared-dev/staging deployment:

```cmd
npm ci
npm run db:migrate:shared
npm run db:provision:current
npm run db:verify-permissions:current
npm run build
pm2 restart gr8booksneo-backend-shared-dev --update-env
pm2 save
```

Use the matching environment-specific migration command when deploying staging
or production.

---

# Safe Provision Workflow

Migrations deploy committed schema changes only:

```cmd
npm run db:migrate:shared
```

Provisioning applies idempotent platform infrastructure data:

```cmd
npm run db:provision:current
```

Verification checks meaningful deployment requirements:

- platform provision version exists and is applied
- modules exist
- permissions exist
- module sidebar templates exist
- active memberships have sidebar rows
- orphaned permission/company module rows are absent
- legacy catalog tables are absent

```cmd
npm run db:verify-permissions:current
```

---

# Environment Matrix

| Environment | Migrate | Safe Provision       | Full Seed | Verification |
| ----------- | ------- | -------------------- | --------- | ------------ |
| Local       | Yes     | Yes                  | Yes       | Yes          |
| Shared Dev  | Yes     | Yes                  | No        | Yes          |
| Staging     | Yes     | Yes                  | No        | Yes          |
| Production  | Yes     | Yes, explicit opt-in | No        | Yes          |

Production provisioning requires:

```env
ALLOW_PRODUCTION_SAFE_SEED=true
```

---

# Commands

`db:provision`

Runs `db:provision:current`. Use this on the currently configured local `.env`.

`db:provision:current`

Runs platform provisioning using `.env`. This is the preferred command for the
current checked-out deployment environment on the VPS.

`db:provision:shared`

Runs platform provisioning using `.env.shared-dev`.

`db:provision:staging`

Runs platform provisioning using process environment variables with
`APP_ENV=staging`.

`db:provision:production`

Runs platform provisioning using process environment variables with
`APP_ENV=production`. Requires `ALLOW_PRODUCTION_SAFE_SEED=true`.

`db:materialize-sidebars:current`

Targeted recovery command that creates missing user sidebar rows only. Use this
when verification reports missing sidebars and the full platform catalog is
already healthy.

`db:materialize-sidebars:shared`

Same targeted recovery command for `.env.shared-dev`.

`db:materialize-sidebars:staging`

Same targeted recovery command for staging process env.

`db:materialize-sidebars:production`

Same targeted recovery command for production process env. Requires
`ALLOW_PRODUCTION_SAFE_SEED=true`.

`db:verify-permissions:current`

Verifies permission and sidebar deployment health using `.env`.

`db:verify-permissions:shared`

Verifies permission and sidebar deployment health using `.env.shared-dev`.

`db:verify-permissions:staging`

Verifies permission and sidebar deployment health using staging process env.

`db:verify-permissions:production`

Verifies permission and sidebar deployment health using production process env.

---

# CI/CD

Shared-dev example:

```cmd
npm ci
npm run db:migrate:shared
npm run db:provision:current
npm run db:verify-permissions:current
npm run build
pm2 restart gr8booksneo-backend-shared-dev --update-env
pm2 save
```

Staging example:

```cmd
npm ci
npm run db:migrate:staging
npm run db:provision:staging
npm run db:verify-permissions:staging
npm run build
pm2 restart gr8booksneo-backend-staging --update-env
pm2 save
```

Production example:

```cmd
npm ci
npm run db:migrate:production
ALLOW_PRODUCTION_SAFE_SEED=true npm run db:provision:production
npm run db:verify-permissions:production
npm run build
pm2 restart gr8booksneo-backend-production --update-env
pm2 save
```

---

# Architecture Decisions

The implementation intentionally avoids registry frameworks, plugin systems,
event-driven provisioning, generic execution pipelines, and task factories.

Those patterns are not justified yet. The project currently needs a small
number of ordered, idempotent platform steps. A direct runner is easier to read,
easier to debug, and easier for new developers to understand within minutes.

`PlatformVersion` is kept because it provides operational value with low
maintenance cost. It answers a practical deployment question: did this
environment run the expected platform provision version?

The health endpoint reports only deployment diagnostics: database status,
storage configuration status, platform provision status/version, and basic
catalog counts. It does not expose administrative controls.

---

# Future Expansion

Future infrastructure data can be added as additional explicit provision steps:

- billing catalogs
- tax catalogs
- localization catalogs
- feature provisioning
- workflow templates
- report templates

Each new step should remain idempotent and should avoid deleting user-owned
data. Keep adding explicit ordered steps until the workflow becomes difficult to
maintain. Only then should the project consider a registry or larger
provisioning framework.
