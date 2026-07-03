PHASE 6 — Stabilization Review + Auth/Me Integration Coverage

Goal:
Validate the extracted access architecture before changing entitlement behavior.

Do NOT change business behavior.
Do NOT change EntitlementService internals yet.
Do NOT change company_modules semantics yet.
Do NOT redesign sidebar preferences yet.
Do NOT optimize Prisma queries yet.
Do NOT change API response shape.
Do NOT change frontend.
Do NOT change database schema.

Current architecture:
AccessControlService
-> CompanyAccessResolver
-> EntitlementService
-> PermissionService
-> SidebarBuilder
-> AuthUser payload

Phase 6 objective:
Stabilize and verify this architecture with higher-level integration coverage and documentation.

Tasks:

1. Review the current orchestration flow in AccessControlService.
2. Add higher-level tests around /auth/me or resolveAuthUser behavior.
3. Ensure tests cover:
   - active user with active company
   - missing company membership
   - inactive membership
   - inactive company
   - subscription unavailable
   - company admin receiving enabledModules and userModules
   - fresh onboarding company still has non-empty sidebar
4. Verify existing exception messages remain unchanged.
5. Add documentation:
   docs/architecture/access-control-phase-6-stabilization-review.md

Document:

- final orchestration contract
- service boundaries
- what each service owns
- what must not be moved yet
- remaining risks
- readiness checklist before changing EntitlementService internals
- Phase 7 recommendation

Strict boundaries:

- No schema changes.
- No API changes.
- No frontend changes.
- No entitlement behavior changes.
- No permission behavior changes.
- No sidebar behavior changes.
- No provisioning/onboarding changes unless a test exposes a regression.
- No query optimization.

Run:
npm run typecheck
npm test -- --runInBand

Deliverables:

1. Tests added.
2. Files changed.
3. Behavior confirmation.
4. Any regression found.
5. Final architecture summary.
6. Recommendation for Phase 7.

Stop after Phase 6.
Do not proceed to Phase 7.
