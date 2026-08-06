# SaaS Plan Entitlement Architecture

## Summary

Gr8Books Neo now uses a strict SaaS plan-based entitlement model.

Company module access is not customized per company. A company receives modules only through its active subscription plan.

If a customer needs a different module mix, the correct solution is to create or assign a different plan. The platform does not support one-off company module exceptions.

## Entitlement Flow

```text
Company
  -> CompanySubscription
  -> SubscriptionPlan
  -> SubscriptionPlanSystem
  -> ModuleSystem
  -> ModuleSystemModule
  -> Module
```

This is the only runtime source of company module access.

## Core Rules

- A company stores subscription state, not module entitlement rows.
- A subscription plan defines the bundle.
- A plan contains one or more module systems.
- A module system contains the actual modules.
- Runtime access is resolved by `EntitlementService`.
- Feature services must not query plan/module-system tables directly for entitlement decisions.
- Feature services must not store or infer company-specific module overrides.
- `/auth/me` still returns `enabledModules` for frontend compatibility, but the values are plan-derived.

## Removed Legacy Model

The previous architecture allowed duplicated company-specific module state:

```text
Company -> company_modules -> Module
Company -> company_module_exceptions -> Module
```

That model is retired.

The following concepts are no longer part of the architecture:

- `company_modules`
- `company_module_exceptions`
- company-specific module enable/disable exceptions
- compatibility toggles for company module rows
- audit/backfill/cleanup scripts for company module compatibility

## Why This Is Better SaaS Architecture

Plan-based entitlement keeps billing, access, and product packaging aligned.

For example:

```text
Plan 1: Accounting
  -> accounting module system
  -> accounting modules

Plan 2: Accounting + Inventory
  -> accounting module system
  -> inventory module system
  -> accounting and inventory modules
```

Companies reference plans:

```text
Zed   -> Plan 1
Kata  -> Plan 2
Nasus -> Plan 3
```

Companies do not duplicate module rows:

```text
Zed -> A
Zed -> B
Zed -> C
```

Instead, Zed points to Plan 1, and Plan 1 defines A, B, and C.

## Runtime Responsibilities

`EntitlementService`

- resolves company allowed modules from the latest usable subscription plan
- exposes module IDs and module records for other services
- owns the plan/module-system traversal

`CompanyAccessResolver`

- loads the authenticated company context
- includes the latest usable subscription plan systems needed by access control

`PermissionService`

- filters permissions against plan-derived enabled module codes

`SidebarBuilder`

- builds navigation from plan-derived entitled modules, user permissions, module-system sidebar templates, and user sidebar customization

`UserSidebarService`

- preserves user sidebar customization
- uses `EntitlementService` to know which modules are allowed

## Sidebar Customization

Sidebar layout customization is still allowed.

Module entitlement customization is not allowed.

Users may customize how allowed modules appear in their sidebar, but they cannot add modules outside the company's subscription plan.

## Database Model

Current entitlement tables:

- `company_subscriptions`
- `subscription_plans`
- `subscription_plan_systems`
- `module_systems`
- `module_system_modules`
- `modules`

Retired tables:

- `company_modules`
- `company_module_exceptions`

## Deployment Flow

Use the normal safe deployment flow:

```bash
npm run db:migrate:shared
npm run db:provision:current
npm run db:verify-permissions:current
npm run build
```

Environment-specific variants should use the matching `shared`, `staging`, or `production` scripts.

## Verification Checklist

- Active companies have a usable subscription.
- Active subscription plans have enabled module systems.
- Enabled module systems contain active modules.
- `/auth/me` returns expected `enabledModules`.
- Sidebar contains only plan-allowed modules.
- Form signatory module options contain only plan-allowed modules.
- No runtime code references `company_modules`.
- No runtime code references `company_module_exceptions`.

## Product Rule

No per-company module customization.

If a customer wants Accounting plus one Inventory feature, create a plan for that bundle. Do not create company-specific module overrides.
