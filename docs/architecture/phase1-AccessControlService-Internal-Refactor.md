PHASE 1 — AccessControlService Internal Refactor

Goal:
Prepare AccessControlService for the modern SaaS authorization architecture without changing behavior.

Important:
Do NOT implement EntitlementService yet.
Do NOT implement PermissionService yet.
Do NOT implement SidebarBuilder yet.
Do NOT change database schema.
Do NOT change API response shape.
Do NOT change frontend.
Do NOT change onboarding/provisioning logic.

This phase is only an internal cleanup/refactor.

Current context:
Phase 0 stabilized staging. New onboarding now creates company_modules from the selected plan/module system, and /auth/me returns non-empty enabledModules and userModules without needing manual provision after every onboarding.

Long-term target architecture:
Subscription Plan
-> Module Systems
-> Modules
-> EntitlementService
-> PermissionService
-> SidebarBuilder
-> UserSidebarPreferences
-> Final Sidebar

Phase 1 objective:
Make AccessControlService easier to understand and prepare it for later extraction.

Tasks:

1. Read AccessControlService completely.
2. Identify its current responsibilities:
   - active company resolution
   - membership resolution
   - branch/unit access
   - enabled module resolution
   - permission resolution
   - sidebar/userModules building
   - customization handling
   - company switching support
   - auth/me access response assembly

3. Refactor only inside AccessControlService.
   - Extract large internal logic blocks into private helper methods.
   - Improve method names.
   - Reduce duplicated logic if behavior remains identical.
   - Add clear section comments if useful.
   - Keep public method signatures unchanged.

4. Do not move logic into new services yet.
   This phase is preparation only.

5. Add/update documentation:
   docs/architecture/access-control-phase-1-review.md

The document should include:

- current responsibilities discovered
- helper methods extracted
- what should later become EntitlementService
- what should later become PermissionService
- what should later become SidebarBuilder
- risks discovered
- suggested Phase 2 extraction order

Acceptance criteria:

- /auth/me response is unchanged.
- Login still works.
- Signup/onboarding still works.
- Company switch still works.
- Sidebar still works.
- Existing tests pass.
- Typecheck passes.
- No schema changes.
- No frontend changes.
- No API contract changes.

Testing:
Run:
npm test -- access-control.service.spec.ts onboarding.service.spec.ts --runInBand
npm run typecheck
npm test -- --runInBand

Deliverables:

1. Summary of changed files.
2. Private helpers extracted.
3. Behavior confirmation.
4. Test results.
5. Risks or concerns found.
6. Recommendation before Phase 2.

Stop after Phase 1.
Do not proceed to Phase 2.
