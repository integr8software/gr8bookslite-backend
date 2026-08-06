# Platform Provisioning

## Phase 2 Architecture Review

### Strengths Of The Phase 1 Safe Seed Architecture

- Safe infrastructure data was separated from local fixture data.
- Shared-dev and staging can seed module/sidebar infrastructure without running
  full `prisma db seed`.
- Existing seed functions are idempotent for module catalog and permission
  catalog data.
- User sidebar materialization does not use `force`, so it creates missing rows
  without wiping customized sidebars.
- Verification reports permission/sidebar health and fails deployment when
  active memberships are missing sidebars.
- Backend-owned `/storage/*` removes the separate storage PM2 dependency.

### Review Findings

- Multiple seed-oriented scripts can grow into a script matrix that developers
  must memorize.
- There was no durable platform version record proving which infrastructure
  provision version was applied to an environment.
- Health checks did not expose provision status, catalog counts, or storage
  configuration.
- A registry/task framework was more abstraction than the project needs today.

### Refactor Direction

Phase 2 keeps platform provisioning as a small, explicit workflow.
Provisioning is deterministic, idempotent, versioned, and self-verifying without
introducing a registry framework or plugin system.

## Ownership Model

Platform-owned data:

- module catalog
- permission catalog
- module systems
- module system sidebar templates
- future workflow/default/reference templates

User-owned data:

- companies
- users
- memberships
- branches
- transactions
- user-customized sidebars
- operational records

Provisioning may create missing user-sidebar rows for active memberships, but it
must not delete or overwrite customized sidebars.

## Provision Lifecycle

1. Deploy committed migrations.
2. Run platform provision.
3. Provision runner executes explicit steps in order.
4. Runner records `platform_versions` singleton row with version/checksum.
5. Verification checks catalog/sidebar/reference integrity.
6. Health endpoint exposes database, storage, platform version, and counts.

Preferred command:

```cmd
npm run db:provision:current
```

## Provision Steps

The current provision runner is intentionally direct:

```ts
await seedModules();
await seedModuleSystems();
await seedUserSidebars();
```

Current steps:

1. `platform-catalog`
2. `module-systems`
3. `user-sidebars`

## Adding A Future Provision Task

1. Add an explicit function call to `runPlatformProvision()`.
2. Keep the step idempotent.
3. Upsert platform-owned rows.
4. Avoid deleting user-owned rows.
5. Update verification if the step introduces required infrastructure data.
6. Bump `PlatformProvisionVersion`.

Do not introduce a registry, plugin system, or event pipeline unless the number
of provision steps grows enough that direct sequencing becomes hard to maintain.

## Versioning

The `platform_versions` table stores the active platform provision version:

- `current_version`
- `checksum`
- `status`
- `applied_by`
- `applied_at`

The checksum is derived from the target provision version and ordered provision
steps. It gives deployments a stable way to confirm that the expected provision
plan ran.

## Recovery Workflow

If verification fails after migrations:

```cmd
npm run db:provision:current
npm run db:verify-permissions:current
```

If sidebars are missing, repair the active company subscription plan, module
system module links, or module-system sidebar templates. Runtime sidebars are no
longer materialized into per-user rows.

Do not run full `prisma db seed` outside local development.

## Production Rules

Production provision commands require:

```env
ALLOW_PRODUCTION_SAFE_SEED=true
```

Full `prisma db seed` remains blocked outside local.
