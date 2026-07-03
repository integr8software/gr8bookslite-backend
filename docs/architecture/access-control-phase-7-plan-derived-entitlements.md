# Access Control Phase 7 Plan-Derived Entitlements

## Overview

Phase 7 changes `EntitlementService` internals so effective modules can come from the active/latest subscription plan's module systems while keeping `company_modules` as compatibility data.

The public access response shape is unchanged:

- `enabledModules`
- `permissions`
- `userModules`

No schema changes, frontend changes, onboarding changes, provisioning changes, or sidebar persistence changes were introduced.

## What Changed

`EntitlementService` now computes effective modules in this order:

1. Read modules from the latest loaded subscription plan systems.
2. Use those plan/module-system modules as base entitlements when present.
3. Add enabled `company_modules` rows as compatibility additions.
4. Deduplicate by `moduleId`.
5. If no usable plan modules exist, fall back to the previous `company_modules` behavior.

This keeps legacy companies working while allowing newly provisioned plan/module-system data to become the long-term source.

## Why company_modules Is Still Kept

`company_modules` is still needed because existing data may contain:

- legacy enabled modules
- company-specific access additions
- manually repaired entitlements
- modules created before plan/module-system links were reliable

Deleting or ignoring it would risk breaking existing companies.

## Compatibility Behavior

Compatibility is additive only in this phase.

```text
effectiveModules =
  latest subscription plan system modules
  + enabled company_modules compatibility additions
```

Fallback:

```text
if no plan system modules exist:
  effectiveModules = enabled company_modules
```

No module is disabled or removed in Phase 7.

## Why This Is Safer Than Deleting company_modules

This approach lets the platform start using subscription-plan-derived entitlements without forcing an immediate migration of all existing companies.

It also keeps rollback simple because the compatibility table remains populated and the previous behavior is still available as fallback.

## Rollback Plan

If plan-derived entitlements produce incorrect access in staging:

1. Revert the `EntitlementService` logic to use `company.enabledModules` directly.
2. Keep the resolver include additions harmlessly or remove them in the same revert.
3. Existing `company_modules` rows remain intact, so users should return to the previous runtime behavior.

No database rollback is required because this phase has no schema or data migration.

## Risks

- Existing `company_modules` rows may still contain old over-grants, and Phase 7 still includes them as compatibility additions.
- Plan/module-system data must be correctly provisioned before relying on it.
- The membership include graph now loads module-system modules in addition to sidebar templates.
- This phase does not introduce explicit add-on/exclusion semantics yet.

## Future Direction

`company_modules` should eventually become explicit exception data rather than broad entitlement materialization.

Future semantics may include:

- `ADDON`
- `EXCLUDE`
- `TEMPORARY`
- `ENTERPRISE`

That likely requires schema and migration planning in a later phase.

## Phase 8 Recommendation

Phase 8 should formalize company module exceptions.

Recommended steps:

1. Define whether `company_modules` remains the table or a new override table is needed.
2. Decide how to represent add-ons and exclusions.
3. Write migration/backfill strategy for existing `company_modules`.
4. Add staging verification queries before changing production semantics.

Do not remove compatibility additions until existing company data is audited.
