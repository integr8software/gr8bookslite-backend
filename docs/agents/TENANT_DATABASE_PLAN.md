# Database Multi-Company Plan

## Goal

Keep PostgreSQL database for the whole platform while preventing:

- company data mixing
- accidental cross-company reads
- accidental cross-company writes
- unclear ownership of users, roles, and permissions

This means we stay on a shared database, but every business-facing table must be tenant-aware through `company_id`.

## Core Access Model

### 1. `users`

Global identity records.

- one user can belong to many companies
- only `SUPER_ADMIN` is global
- normal users become company-aware through membership

### 2. `companies`

Tenant root.

- every company is the top isolation boundary
- future `satellite` and `branch` levels will remain children of a company
- we are not creating satellite or branch tables yet

### 3. `memberships`

Join table between `users` and `companies`.

- tells us which user belongs to which company
- carries membership lifecycle and active state
- points to a company-specific role
- allows direct permission overrides when needed

### 4. `company_roles`

Company-owned roles.

- each company manages its own roles
- recommended starter roles: `ADMIN`, `USER`
- can support future custom roles without schema redesign

### 5. `platform_modules`

Catalog of system modules such as:

- dashboard
- accounting
- inventory
- sales
- purchases
- payroll
- reports
- settings

### 6. `permissions`

Fine-grained permission catalog per module.

Examples:

- `inventory.products`
- `inventory.stock_adjustment`
- `sales.invoices`
- `settings.users`

Each permission can later be scoped to:

- `COMPANY`
- `SATELLITE`
- `BRANCH`

That makes the schema future-ready without creating operational unit tables today.

### 7. `company_role_permissions`

Role-to-permission matrix.

- defines what an Admin or User can do inside a company
- stores actions like view, create, update, delete, approve, export

### 8. `membership_permissions`

Optional user-level overrides.

Use this when a company admin wants to adjust a single user beyond the base role.

### 9. `company_modules`

Which modules are enabled for each company.

- a company may subscribe to a module but keep it disabled
- permission checks should fail when the module is disabled even if the role allows it

### 10. `audit_logs`

Tracks sensitive activity.

Recommended for:

- user creation
- role assignment
- permission changes
- module enable/disable
- company status changes

## Isolation Rules

### Mandatory Rule

Every company-owned business table must contain:

- `company_id`

Examples for future tables:

- `customers`
- `vendors`
- `products`
- `invoices`
- `journal_entries`
- `inventory_transactions`

### Query Rule

For non-super-admin requests:

- never query by `id` alone for tenant-owned records
- always query by `company_id` plus the record identifier

Good example:

```ts
where: {
  id: invoiceId,
  companyId: auth.companyId,
}
```

Unsafe example:

```ts
where: {
  id: invoiceId,
}
```

### Constraint Rule

Prefer composite uniqueness for tenant data.

Good examples:

- `@@unique([companyId, code])`
- `@@unique([companyId, email])` if emails are company-local
- `@@unique([companyId, externalId])`

This avoids collisions and keeps records scoped correctly.

## Role Strategy

### Super Admin

Global platform authority.

- can access all companies
- can manage company lifecycle
- can inspect global audit activity
- should be used sparingly

### Admin

Company-scoped authority.

- only within memberships they hold
- can manage users of their own company
- can assign roles and permissions inside their own company

### User

Company-scoped access.

- only sees the company they are acting inside
- only accesses modules and actions granted by role or override

## Future Satellite And Branch Readiness

We are not creating `satellite` or `branch` tables yet.

The schema is ready because:

- company remains the tenant root
- permissions already support `COMPANY`, `SATELLITE`, and `BRANCH` scope levels
- future operational unit tables can attach under one company without changing user identity structure

Later we can add something like:

- `company_units`
- `membership_unit_access`
- `record_unit_scope`

without redesigning the current authentication base.

## Recommended Backend Guardrails

### In JWT

Keep:

- `sub`
- `companyId`
- high-level app role

Add later if needed:

- `membershipId`
- `companyRoleId`

### In Services

Before every tenant action:

1. resolve active company from JWT
2. confirm membership is active
3. confirm module is enabled for the company
4. confirm permission from role plus overrides
5. filter queries by `companyId`

### In Prisma Access

For tenant-owned entities:

- create helper methods that always inject `companyId`
- avoid raw unscoped `findUnique` for tenant tables

## Practical Seeder Direction

Seed these base records:

- one `SUPER_ADMIN`
- default modules
- default permissions
- default company roles per company:
  - `ADMIN`
  - `USER`

Then when a new company is created:

1. create the company
2. create default company roles
3. enable selected modules
4. create admin membership
5. attach role permissions

## Summary

This shared-database design is safe if we stay disciplined:

- one database
- one tenant root: `company`
- one membership table for user-to-company access
- one company role system
- one permission matrix
- one strict rule that all company-owned data must carry `company_id`

That gives us strong isolation now and a clean path for future satellite and branch support later.
