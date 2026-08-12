# Gr8Books Neo Backend Implementation Prompt

## Objective

Refactor the Gr8Books Neo backend deployment, seed, verification, and storage setup into a permanent, safe, and scalable architecture for shared-dev, staging, and future production CI/CD.

This is not a one-time fix. The goal is to make module/sidebar seeding, storage serving, and deployment predictable as the system grows.

---

## Current Context

Gr8Books Neo uses:

- Backend: NestJS + Prisma + PostgreSQL
- Frontend: Next.js
- Deployment target: Windows VPS + IIS + PM2
- Current VPS ports:
  - Frontend: `localhost:3001`
  - Backend: `localhost:3002`
- The separate storage PM2 service/repo is being retired.
- Backend now owns both API and static storage serving.

Current intended public URLs:

```env
FRONTEND=https://staging.gr8booksneo.integr8.com.ph
API=https://api.staging.gr8booksneo.integr8.com.ph
STORAGE=https://api.staging.gr8booksneo.integr8.com.ph/storage
```

Current backend VPS storage env should be:

```env
STORAGE_PROVIDER=vps
STORAGE_ENV=shared-dev
VPS_STORAGE_API_URL=http://localhost:3002/api/v1/storage/internal
VPS_STORAGE_PUBLIC_URL=https://api.staging.gr8booksneo.integr8.com.ph/storage
VPS_STORAGE_ROOT=I:\Gr8BooksNeo\storage
VPS_STORAGE_SECRET=test-secret
```

IIS API site should proxy everything to backend:

```txt
gr8booksneo-api-staging
Pattern: (.*)
Rewrite URL: http://localhost:3002/{R:1}
```

Static file serving has already been proven working locally on VPS:

```cmd
curl -I http://localhost:3002/storage/shared-dev/avatars/user-4/<file>.jpg
```

Expected result:

```txt
HTTP/1.1 200 OK
Content-Type: image/jpeg
```

---

## Problem To Solve

The shared-dev deployment DB has incomplete permission/sidebar infrastructure data.

Verification currently showed:

```txt
modules: 62
permissions: 62
sidebarItems: 0
sidebarLinks: 0
membershipsWithoutSidebar: 42
```

This proves:

- Module and permission catalog exists.
- Sidebar template/user sidebar materialization is missing.
- `db:seed:reference:shared` only seeds address/reference data and does not seed module/sidebar data.
- `prisma db seed` is correctly blocked in `APP_ENV=shared-dev` by the DB guard.

The permanent fix is not to bypass the guard. The permanent fix is to introduce safe, idempotent infrastructure seed commands that are allowed in shared-dev/staging, and tightly controlled in production.

---

## Design Principle

Treat these as **infrastructure data**, not sample/local fixture data:

- Platform modules
- Module permissions
- Module systems
- Module system sidebar templates
- User sidebar materialization for active memberships

Infrastructure data must be safe to seed repeatedly in shared-dev/staging and eventually production.

Local fixtures/sample data must remain local-only.

---

## Required Architecture

### 1. Separate Full Seed From Safe Seed

Keep full Prisma seed local-only.

`prisma db seed` may continue to run local setup, but it must remain blocked for shared-dev/staging/production if it can include local fixtures or destructive behavior.

Add a safe seed pipeline for non-local environments.

Recommended structure:

```txt
prisma/
  seed.ts                         # local/full seed only
  scripts/
    seed-reference.ts             # reference-only seed
    seed-safe.ts                  # safe infrastructure seed entrypoint
    seed-platform-catalog.ts      # modules/permissions catalog
    seed-module-systems.ts        # module systems + sidebar templates
    materialize-user-sidebars.ts  # missing user sidebars only
    verifyPermissionArchitecture.ts
    verifyReferenceData.ts        # optional, if useful
  seeds/
    seedModules.ts
    seedModuleSystems.ts
    seedUserSidebars.ts
    ...existing seed files
```

If the exact file names differ, keep the same intent and choose clear names.

---

### 2. Add Safe Idempotent Seed Entrypoint

Create a safe seed entrypoint, for example:

```txt
prisma/scripts/seed-safe.ts
```

It should run only safe infrastructure seeds:

```ts
await seedModules();
await seedModuleSystems();
await seedUserSidebars();
```

It must not:

- delete companies
- delete users
- delete memberships
- delete branches
- reset business data
- truncate tables
- create local fixtures
- overwrite user-owned business data

It may:

- upsert module catalog data
- upsert permission catalog data
- upsert module system definitions
- upsert module system sidebar templates
- create missing user sidebar rows for active memberships/branches

It must be idempotent and safe to run multiple times.

Add useful logging:

```txt
Before:
modules=X permissions=X sidebarTemplates=X userSidebarItems=X membershipsWithoutSidebar=X

After:
modules=X permissions=X sidebarTemplates=X userSidebarItems=X membershipsWithoutSidebar=X

Safe seed complete.
```

---

### 3. Add Targeted Safe Scripts

Add or expose targeted scripts:

```txt
prisma/scripts/seed-platform-catalog.ts
prisma/scripts/seed-module-systems.ts
prisma/scripts/materialize-user-sidebars.ts
```

Purpose:

- `seed-platform-catalog.ts`
  - Runs `seedModules()` and any permission catalog seeding if applicable.

- `seed-module-systems.ts`
  - Runs `seedModuleSystems()`.

- `materialize-user-sidebars.ts`
  - Runs `seedUserSidebars()` or equivalent missing-sidebar materialization.
  - Must only create missing sidebar rows.
  - Must not delete customized existing user sidebars.

---

### 4. Refactor DB Guard

Current guard blocks generic maintenance in `APP_ENV=shared-dev`, which is correct for destructive maintenance.

Refactor the guard to distinguish operations by risk.

Allowed in `APP_ENV=shared-dev` and `APP_ENV=staging`:

```txt
seed:reference
seed:safe
seed:platform-catalog
seed:module-systems
materialize:user-sidebars
verify
prisma:generate
prisma:migrate:deploy
prisma:status
```

Blocked in `shared-dev`, `staging`, and `production` unless explicitly allowed:

```txt
prisma:db:seed        # full seed
prisma:reset
prisma:migrate:reset
delete:user-owned-data
destructive:maintenance
```

Production rules:

- Safe seed should be blocked by default in production.
- Allow production safe seed only if explicitly enabled by env:

```env
ALLOW_PRODUCTION_SAFE_SEED=true
```

This prevents accidental production seed runs while still allowing controlled infrastructure updates.

---

### 5. Add Package Scripts

Add scripts that are clear and CI/CD friendly.

For current env file, useful on VPS:

```json
{
  "db:seed:safe:current": "node scripts/run-with-env.cjs .env ts-node prisma/scripts/seed-safe.ts",
  "db:verify:permissions:current": "node scripts/run-with-env.cjs .env ts-node prisma/scripts/verifyPermissionArchitecture.ts",
  "db:seed:reference:current": "node scripts/run-with-env.cjs .env ts-node prisma/scripts/seed-reference.ts",
  "db:materialize-sidebars:current": "node scripts/run-with-env.cjs .env ts-node prisma/scripts/materialize-user-sidebars.ts"
}
```

For shared-dev if `.env.shared-dev` is retained:

```json
{
  "db:seed:safe:shared": "node scripts/run-with-env.cjs .env.shared-dev ts-node prisma/scripts/seed-safe.ts",
  "db:verify:permissions:shared": "node scripts/run-with-env.cjs .env.shared-dev ts-node prisma/scripts/verifyPermissionArchitecture.ts",
  "db:materialize-sidebars:shared": "node scripts/run-with-env.cjs .env.shared-dev ts-node prisma/scripts/materialize-user-sidebars.ts"
}
```

For staging/production using process env:

```json
{
  "db:seed:safe:staging": "node scripts/run-with-process-env.cjs staging ts-node prisma/scripts/seed-safe.ts",
  "db:verify:permissions:staging": "node scripts/run-with-process-env.cjs staging ts-node prisma/scripts/verifyPermissionArchitecture.ts",
  "db:seed:safe:production": "node scripts/run-with-process-env.cjs production ts-node prisma/scripts/seed-safe.ts",
  "db:verify:permissions:production": "node scripts/run-with-process-env.cjs production ts-node prisma/scripts/verifyPermissionArchitecture.ts"
}
```

Keep local full seed:

```json
{
  "db:seed:local": "node scripts/run-with-env.cjs .env prisma db seed"
}
```

But ensure local full seed is only approved when `APP_ENV=local`.

---

### 6. Improve Verification

Update `prisma/scripts/verifyPermissionArchitecture.ts` if needed.

It should report:

```txt
modules
permissions
moduleSystemSidebarTemplates
sidebarItems
sidebarLinks
companies
activeMemberships
membershipsWithoutSidebar
orphanPermissions
orphanCompanyModules
legacyCatalogTablesPresent
```

It should exit non-zero if:

```txt
modules == 0
permissions == 0
moduleSystemSidebarTemplates == 0
sidebarItems == 0
sidebarLinks == 0
membershipsWithoutSidebar > 0
orphanPermissions > 0
orphanCompanyModules > 0
legacyCatalogTablesPresent == true
```

If there are valid reasons for zero active memberships in a brand-new environment, handle that explicitly with a clear message. But shared-dev/staging with active memberships should not pass with missing sidebars.

---

### 7. Add Deployment Documentation

Create docs:

```txt
docs/deployment/database/staging-seed-workflow.md
```

Document recommended VPS/backend deployment flow:

```cmd
git checkout staging
git pull
npm ci
node scripts/run-with-env.cjs .env prisma migrate deploy
node scripts/run-with-env.cjs .env prisma generate
npm run db:seed:safe:current
npm run db:verify:permissions:current
npm run build
pm2 restart gr8booksneo-backend-shared-dev --update-env
pm2 save
```

Also document that the VPS should deploy from the `staging` branch, not arbitrary `develop`, once staging branch is established.

---

### 8. Storage Architecture Cleanup

Backend is now the single service for API + storage.

Ensure backend supports:

```txt
/api/v1/*
/storage/*
```

With env:

```env
VPS_STORAGE_API_URL=http://localhost:3002/api/v1/storage/internal
VPS_STORAGE_PUBLIC_URL=https://api.staging.gr8booksneo.integr8.com.ph/storage
VPS_STORAGE_ROOT=I:\Gr8BooksNeo\storage
```

Static serving rule:

```txt
/storage/shared-dev/avatars/user-4/file.jpg
maps to
I:\Gr8BooksNeo\storage\shared-dev\avatars\user-4\file.jpg
```

Do not require `VPS_STORAGE_PUBLIC_URL` to be localhost.

Deprecate any documentation suggesting that a separate storage PM2 process is required for this VPS staging setup.

Do not delete old storage-related code unless it breaks compatibility. Prefer to document the new recommended deployment architecture.

---

### 9. IIS/ARR Notes For Docs

Document the current IIS setup:

Frontend site:

```txt
gr8booksneo-frontend-staging
Host: staging.gr8booksneo.integr8.com.ph
Rewrite: http://localhost:3001/{R:1}
```

API site:

```txt
gr8booksneo-api-staging
Host: api.staging.gr8booksneo.integr8.com.ph
Rewrite: http://localhost:3002/{R:1}
```

No separate storage site is required.

ARR setting:

```txt
Reverse rewrite host in response headers = disabled
```

Reason: Google OAuth redirects must preserve external redirect hosts such as:

```txt
https://accounts.google.com/o/oauth2/v2/auth
```

If ARR rewrites response headers, it can incorrectly turn Google redirects into:

```txt
https://api.staging.gr8booksneo.integr8.com.ph/o/oauth2/v2/auth
```

---

### 10. Branch Strategy

Prepare the implementation on a proper branch.

Preferred:

```cmd
git checkout staging
git pull
```

Then create:

```cmd
git checkout -b chore/safe-seed-storage-deployment-refactor
```

If `staging` does not exist yet, create it from the intended deploy base after confirmation.

Do not deploy from random `develop` once staging is established.

---

## Acceptance Criteria

### Safe seed commands work on VPS shared-dev

```cmd
npm run db:seed:safe:current
npm run db:verify:permissions:current
```

Expected verification:

```txt
modules > 0
permissions > 0
moduleSystemSidebarTemplates > 0
sidebarItems > 0
sidebarLinks > 0
membershipsWithoutSidebar = 0
orphanPermissions = 0
orphanCompanyModules = 0
```

### Full seed remains blocked in shared-dev

This should still fail:

```cmd
node scripts/run-with-env.cjs .env prisma db seed
```

Expected:

```txt
Operation "prisma:db:seed" is forbidden when APP_ENV=shared-dev.
```

### Backend static storage works

```cmd
curl -I http://localhost:3002/storage/shared-dev/avatars/user-4/<file>.jpg
```

Expected:

```txt
HTTP/1.1 200 OK
Content-Type: image/jpeg
```

Public URL should also work:

```cmd
curl -I https://api.staging.gr8booksneo.integr8.com.ph/storage/shared-dev/avatars/user-4/<file>.jpg
```

Expected:

```txt
HTTP/1.1 200 OK
Content-Type: image/jpeg
```

### Google OAuth still works

Backend OAuth redirect must return Google domain:

```cmd
curl -I https://api.staging.gr8booksneo.integr8.com.ph/api/v1/auth/google
```

Expected `Location` starts with:

```txt
https://accounts.google.com/o/oauth2/v2/auth
```

### No destructive behavior

Implementation must not:

- reset shared/staging DB
- delete companies
- delete memberships
- delete users
- delete customized sidebars unless explicitly part of a user-triggered reset flow
- run local fixtures in shared-dev/staging/production

---

## Deliverables

1. Code changes for safe seed scripts.
2. Guard refactor allowing safe seeds but blocking full/destructive seeds.
3. Package scripts for current/shared/staging/production workflows.
4. Verification improvements.
5. Deployment documentation.
6. Storage deployment documentation update.
7. Summary of files changed.
8. Exact commands to run on VPS after merge.

---

## Notes

The previous issue was not that the backend failed to seed all data locally. Local worked.

The issue was that shared-dev only ran reference seed, leaving sidebar infrastructure incomplete. Therefore, sidebar/module catalog seeding must be treated as deployment infrastructure, not local sample data.

This design should remain valid as Gr8Books Neo grows to more modules, permissions, module systems, branches, companies, and deployment environments.
