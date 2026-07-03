PHASE 7 — Plan-Derived Entitlements With company_modules Compatibility

Goal:
Start moving EntitlementService toward modern SaaS entitlements.

Current stable architecture:
AccessControlService
-> CompanyAccessResolver
-> EntitlementService
-> PermissionService
-> SidebarBuilder
-> AuthUser payload

Current issue:
EntitlementService still uses company_modules as the primary source of enabled modules.

Target direction:
Subscription Plan / Module Systems should define default company modules.
company_modules should become compatibility/exception data, not the primary source forever.

Important:
This is the first behavior-changing phase, so be conservative.

Do NOT:

- delete company_modules
- rename company_modules
- add new schema yet unless absolutely necessary
- remove legacy compatibility
- change frontend contracts
- change /auth/me response shape
- change SidebarBuilder
- change PermissionService
- change onboarding/provisioning
- introduce Redis/cache
- optimize Prisma include graph
- implement sidebar preferences

Implementation requirements:

1. Update EntitlementService internals only.

It should compute effective modules using this priority:

A. If the company has an active/latest subscription with plan systems:

- load modules from subscription plan systems -> module system modules
- use those as base entitlements

B. Apply existing company_modules as compatibility additions for now:

- if company_modules contains enabled modules not in the plan, include them
- do not remove/disable anything yet unless existing behavior already does

C. If no usable plan/module-system entitlements are found:

- fall back to existing company_modules behavior exactly as today

This keeps legacy companies working.

2. Preserve the EntitlementService public interface.

Existing callers should not change:

- AccessControlService
- SidebarBuilder
- PermissionService

3. Keep output shape identical:

- enabled module codes
- enabled module ids
- enabled module records

4. Add tests for:

- company with subscription plan systems gets modules from plan/module systems
- company_modules modules outside the plan are included as compatibility additions
- company with no plan falls back to company_modules
- duplicate modules are de-duplicated
- inactive modules are excluded
- /auth/me still returns enabledModules and userModules
- fresh onboarding company still works

5. Add documentation:

docs/architecture/access-control-phase-7-plan-derived-entitlements.md

Document:

- what changed
- why company_modules is still kept
- how compatibility works
- why this is safer than deleting company_modules
- future direction:
  company_modules becomes explicit exceptions:
  ADDON / EXCLUDE / TEMPORARY / ENTERPRISE
- risks
- rollback plan
- Phase 8 recommendation

Acceptance criteria:

- Existing companies still work.
- Newly onboarded companies still work.
- /auth/me response shape unchanged.
- Sidebar still works.
- No frontend changes.
- No schema changes unless strongly justified.
- Tests pass.
- Typecheck passes.

Run:
npm run typecheck
npm test -- --runInBand

Stop after Phase 7.
Do not proceed to Phase 8.
