Proceed with Phase 0 implementation only.

Fix the staging empty sidebar lifecycle gap described in gr8bookslite-backend/docs/architecture/phase0-stabilize-staging-sidebar-issue.md.

Do not start EntitlementService.
Do not start the large architecture refactor.
Do not change frontend/API contract/schema.

Investigate onboarding completion and selected plan/module system handling.

Goal:
After onboarding completes, a new company should have correct company_modules derived only from the selected subscription plan/module systems, so /auth/me returns non-empty enabledModules and userModules without running db:provision:current.

Keep the change narrow, idempotent, and tested.

Stop after Phase 0 and provide:

- root cause
- files changed
- test results
- how to verify locally/staging
- remaining architecture concerns
