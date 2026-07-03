PHASE 0 — Stabilize Staging Sidebar Issue

Goal:
Fix the immediate staging issue where newly onboarded companies/users get an empty sidebar, without doing the full modern SaaS architecture refactor yet.

Current problem:

- Local signup/onboarding works.
- Staging signup/onboarding creates a company, but /auth/me returns:
  enabledModules: []
  userModules.items: []
- Running db:provision:current manually makes the sidebar appear.
- This means onboarding/runtime is missing required entitlement/module setup.
- Provisioning should not be required after every new company.

Important:
Do NOT implement the full EntitlementService architecture yet.
Do NOT remove company_modules.
Do NOT migrate company_modules yet.
Do NOT redesign the sidebar system yet.
Do NOT change frontend contracts.
Do NOT create large abstractions.

Task:
Investigate and fix only the immediate lifecycle gap.

Please inspect:

- OnboardingService.complete()
- company subscription creation
- selected plan/package handling
- subscription_plan_systems
- module_system_modules
- company_modules creation
- AccessControlService enabledModules logic
- db:provision:current
- seedUserSidebars()

Implementation goal:
After onboarding completes, the new company must have enough module entitlement data so /auth/me returns non-empty enabledModules and userModules without running db:provision:current.

Preferred short-term fix:

- Ensure onboarding/company creation creates company_modules only from the selected subscription plan/module systems.
- Do NOT grant all active modules.
- Do NOT rely on provision.
- Make the operation idempotent.
- Avoid duplicates.
- Preserve existing behavior for legacy companies.

Also review db:provision:current:

- If it currently grants all modules to all companies, do not expand this behavior.
- If safe, stop normal provision from over-granting.
- If stopping it is too risky, document it clearly and create a separate TODO for Phase 1.

Tests:
Add or update tests for:

1. New signup/onboarding creates company module entitlements from selected plan.
2. /auth/me after onboarding returns non-empty enabledModules.
3. Sidebar renders without running provision.
4. Onboarding does not grant all active modules.
5. Re-running onboarding/module assignment logic does not duplicate company_modules.

Acceptance criteria:

- New staging signup + onboarding shows sidebar immediately.
- No manual db:provision:current needed after new company creation.
- company_modules count for a new company matches selected plan/module system, not all modules.
- Existing users still work.
- No frontend changes.
- No API response contract changes.
- No database schema changes unless absolutely necessary.

Deliverables:

1. Summary of root cause.
2. Files changed.
3. What was fixed.
4. How to test locally.
5. How to test on staging.
6. Any remaining architecture concerns for the later modern SaaS refactor.

Stop after Phase 0.
Do not continue to Phase 1.
