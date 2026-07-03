PHASE 2 — Behavior-Preserving EntitlementService Extraction

Goal:
Extract entitlement/module resolution out of AccessControlService without changing behavior.

Important:
Do NOT redesign company_modules yet.
Do NOT change database schema.
Do NOT change API response shape.
Do NOT change frontend.
Do NOT change onboarding/provisioning.
Do NOT implement SidebarBuilder yet.
Do NOT implement PermissionService yet.

Context:
Phase 0 fixed the staging empty sidebar issue.
Phase 1 organized AccessControlService internally.
Now Phase 2 should extract only the enabled module / entitlement responsibility into a dedicated EntitlementService.

Long-term target:
Subscription Plan
-> Plan Modules / Module Systems
-> EntitlementService
-> PermissionService
-> SidebarBuilder
-> UserSidebarPreferences
-> Final Sidebar

But for this phase, keep current behavior.

Current behavior to preserve:
AccessControlService still effectively uses company.enabledModules / company_modules as the runtime entitlement source.

Tasks:

1. Create EntitlementService in an appropriate access/common folder.

Suggested structure:
src/common/access/entitlements/entitlement.service.ts
src/common/access/entitlements/entitlement.types.ts
src/common/access/entitlements/entitlement.module.ts

2. Move only entitlement-related logic from AccessControlService into EntitlementService.

Candidate responsibilities:

- getEnabledModuleCodes
- getEnabledModuleIds
- getPermittedEnabledModules if purely module-filtering
- effective module normalization
- any module entitlement helper that does not depend on sidebar rendering

3. Keep the output identical.

EntitlementService should return:

- enabled module codes
- enabled module ids
- enabled module records if needed by existing logic

Use the same source currently used by AccessControlService.

Do not yet compute from subscription plan directly.

4. AccessControlService should call EntitlementService instead of owning enabled module calculation.

5. Keep public API response unchanged.

The /auth/me response must remain exactly compatible:

- activeAccess.enabledModules
- activeAccess.userModules
- companies
- onboarding

6. Add tests.

Add or update tests for:

- EntitlementService returns the same module codes as current company.enabledModules logic.
- AccessControlService /auth/me still returns the same enabledModules shape.
- Legacy companies still work.
- Empty company enabledModules still results in the same behavior as before.

7. Add documentation.

Create:
docs/architecture/access-control-phase-2-entitlement-service.md

Document:

- what moved
- what stayed in AccessControlService
- why this is behavior-preserving
- why company_modules is still compatibility source
- future plan to change EntitlementService internals to:
  plan modules + company_modules exceptions
- risks
- Phase 3 recommendation

Strict boundaries:

- No schema changes.
- No migrations.
- No frontend changes.
- No API contract changes.
- No provisioning changes.
- No onboarding changes.
- No permission service extraction.
- No sidebar builder extraction.
- No caching yet.
- No Redis yet.

Acceptance criteria:

- Login works.
- /auth/me response unchanged.
- Sidebar still works.
- New onboarding from Phase 0 still works.
- Company switch still works.
- Branch switch still works.
- Tests pass.
- Typecheck passes.

Run:
npm test -- access-control.service.spec.ts onboarding.service.spec.ts --runInBand
npm run typecheck
npm test -- --runInBand

Deliverables:

1. Files changed.
2. EntitlementService responsibilities.
3. What moved from AccessControlService.
4. Behavior confirmation.
5. Test results.
6. Risks found.
7. Recommended next phase.

Stop after Phase 2.
Do not proceed to Phase 3.
