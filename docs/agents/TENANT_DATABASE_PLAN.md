# Database-Per-Company Plan

## Goal

Move from a single shared multi-tenant database model to a split architecture:

- one shared `control_plane` database for platform data
- one separate tenant database per company for accounting and ERP data

This is the safest direction if we want stronger isolation, easier auditability, and a cleaner compliance story for BIR-facing discussions.

## Why This Fits The Current Repo

The current backend already has a natural separation between:

- platform identity and access data
- future company-specific ERP data

Today, the shared platform data is:

- `User`
- `Company`
- `Membership`

These should remain in a shared database.

Future ERP modules such as accounting, invoicing, inventory, payroll, and reports should live in a dedicated database per company.

## Target Architecture

### 1. Shared Control Plane Database

This database holds platform-wide records only.

Recommended tables:

- `users`
- `companies`
- `memberships`
- `tenant_connections`
- optional: `audit_events`
- optional: `plans`
- optional: `subscriptions`
- optional: `feature_flags`

Responsibilities:

- authentication
- authorization
- company registry
- user-to-company membership
- tenant database discovery
- provisioning state tracking

### 2. Per-Company Tenant Database

Each company gets its own operational database.

Recommended modules/tables:

- chart of accounts
- customers
- vendors
- products
- invoices
- receipts
- journal entries
- ledgers
- books of accounts
- tax reports
- inventory
- payroll

Responsibilities:

- all accounting transactions
- all tax-relevant books and reports
- all business records that must stay isolated per taxpayer/company

## Database Boundary Rules

### Shared Database Only

Allowed in `control_plane`:

- identity
- auth
- membership
- company metadata
- tenant connection metadata
- platform-level audit events

Not allowed in `control_plane`:

- journal entries
- invoices
- accounting books
- inventory transactions
- payroll records
- tax reports

### Tenant Database Only

Allowed in each tenant DB:

- financial transactions
- accounting books
- tax-relevant reports
- operational ERP records

This rule is important. Once ERP modules start growing, we should not mix company transactions back into the shared DB.

## Mapping To Current Repo

Current schema in [prisma/schema.prisma](/Users/integr8/Documents/GitHub/gr8lite-backend/prisma/schema.prisma:1):

- `User`
- `Company`
- `Membership`

These become the permanent shared schema.

Add a new shared table:

### `TenantConnection`

Suggested fields:

- `id`
- `companyId`
- `dbName`
- `databaseUrl`
- `status`
- `schemaVersion`
- `createdAt`
- `updatedAt`

Optional fields:

- `region`
- `backupBucket`
- `lastBackupAt`
- `lastMigrationAt`
- `provisioningError`
- `secretRef`

Notes:

- prefer storing a secret reference or encrypted credential instead of plain DB passwords
- add a unique constraint on `companyId`

## Recommended NestJS Design

Use two database access layers.

### 1. Shared Prisma Service

Purpose:

- connect to the shared `control_plane` database
- used by auth and platform modules

Suggested ownership:

- `auth`
- `users`
- `companies`
- `memberships`
- `tenant-admin`

### 2. Tenant Prisma Factory

Purpose:

- resolve the active company
- create or reuse a Prisma client for that company database
- provide tenant-scoped database access to ERP modules

Suggested behavior:

- lookup tenant connection using `companyId`
- cache Prisma clients by company
- validate tenant status before use
- close idle clients when needed

## Request Lifecycle

Recommended backend flow:

1. User logs in through the shared database.
2. JWT contains the active `companyId`.
3. Request enters the app with authenticated user context.
4. Tenant resolver loads the tenant connection for that `companyId`.
5. App creates or reuses the Prisma client for that tenant.
6. Tenant modules use that client for all company-specific operations.

This keeps auth centralized while isolating the business records.

## Suggested Folder Structure

```text
src/
  common/
    tenant/
      tenant-context.ts
      tenant-resolver.service.ts
      tenant.guard.ts
      tenant.interceptor.ts
  modules/
    platform/
      auth/
      users/
      companies/
      memberships/
      tenant-admin/
    tenant/
      accounting/
      sales/
      purchases/
      inventory/
      payroll/
      reports/
  prisma/
    shared-prisma.service.ts
    tenant-prisma.factory.ts
prisma/
  schema.prisma
  tenant.schema.prisma
```

## Prisma Strategy

### Shared Schema

Keep the current shared schema in:

- `prisma/schema.prisma`

This schema should contain:

- `User`
- `Company`
- `Membership`
- `TenantConnection`

### Tenant Schema

Create a second Prisma schema:

- `prisma/tenant.schema.prisma`

This schema should contain all ERP/accounting models.

Important rule:

- every tenant DB should use the exact same tenant schema and migration history

## Provisioning Flow

When a new company is registered:

1. Create the company in the shared DB.
2. Create the default membership for the registering user.
3. Provision a new tenant database.
4. Run tenant migrations on that database.
5. Save the tenant connection metadata in `TenantConnection`.
6. Mark the company as ready for use.

Suggested company lifecycle states:

- `pending`
- `provisioning`
- `active`
- `failed`
- `suspended`

This helps prevent partially created tenants from being used.

## Migration Strategy

Because the repo is still early, the migration path is straightforward.

### Phase 1. Declare The Shared DB As Control Plane

- keep `User`, `Company`, and `Membership`
- add `TenantConnection`
- formalize the shared DB as the control plane

### Phase 2. Introduce Tenant DB Infrastructure

- add `tenant.schema.prisma`
- add `tenant-prisma.factory.ts`
- add tenant connection lookup and caching

### Phase 3. Route ERP Modules To Tenant DBs

- all new accounting and ERP modules use tenant Prisma
- no new transactional modules should be added to the shared DB

### Phase 4. Add Provisioning And Admin Tooling

- tenant DB creation
- tenant migration runner
- health checks
- tenant activation/deactivation

### Phase 5. Add Audit/Backup/Export Tooling

- per-company backup
- per-company restore workflow
- per-company export package
- migration status visibility per tenant

## Operational Requirements

To support audits and compliance discussions, build these early:

- backup per tenant database
- restore procedure per tenant database
- tenant-level migration tracking
- tenant-level health status
- immutable audit log for sensitive actions
- tenant-level export for books and reports

Recommended audit events:

- company created
- tenant DB provisioned
- tenant DB migrated
- user granted access
- user removed from company
- company suspended
- backup generated
- export generated

## Security Guidelines

- do not store raw tenant DB passwords in plain text if avoidable
- prefer a secret manager or encrypted credential store
- validate that the authenticated user belongs to the requested company
- never let client input directly choose an arbitrary database connection
- always resolve tenant DB from trusted shared metadata

## Tradeoffs

### Benefits

- stronger company isolation
- easier audit story
- easier backup and restore per company
- lower risk of cross-tenant data leakage
- cleaner BIR-facing explanation

### Costs

- more infrastructure complexity
- tenant provisioning workflow
- per-tenant migration management
- operational tooling overhead

For this product, the tradeoff is reasonable and likely worth it.

## Recommended Implementation Order

1. Add `TenantConnection` to the shared schema.
2. Keep current auth/users flow on the shared DB.
3. Add `tenant.schema.prisma`.
4. Build `shared-prisma.service.ts`.
5. Build `tenant-prisma.factory.ts`.
6. Add tenant resolver and request context.
7. Add company provisioning flow.
8. Start the first ERP module on tenant DBs only.
9. Add backup/export/audit capabilities.

## Immediate Next Steps For This Repo

The next technical tasks should be:

1. Update shared Prisma schema with `TenantConnection`.
2. Add a second Prisma schema for tenant data.
3. Refactor the current Prisma service into shared and tenant-aware layers.
4. Add a tenant resolver based on `companyId` in JWT/user context.
5. Create a provisioning service for new company databases.
6. Define the first tenant-owned module, likely accounting or sales.

## Practical Recommendation

Do not continue building accounting data into the current shared schema.

Use the current database as the shared control plane, and start all future ERP/accounting modules in a per-company tenant database model now while the codebase is still small.
