PHASE 5 — Extract CompanyAccessResolver (Behavior-Preserving Refactor)

Goal:
Extract company/user/membership loading and validation from AccessControlService into a dedicated CompanyAccessResolver.

This is still a behavior-preserving refactor.

Do NOT redesign queries.
Do NOT optimize Prisma includes.
Do NOT change API response shape.
Do NOT change frontend.
Do NOT change database schema.
Do NOT change onboarding/provisioning.
Do NOT change EntitlementService.
Do NOT change PermissionService.
Do NOT change SidebarBuilder behavior.

Current architecture after Phase 4:
AccessControlService
-> loads user/membership/company context
-> validates company/subscription state
-> EntitlementService
-> PermissionService
-> SidebarBuilder
-> AuthUser payload

Remaining issue:
AccessControlService still owns the large Prisma membership include graph and company/membership context resolution.

Phase 5 objective:
Move that loading/validation responsibility into CompanyAccessResolver so AccessControlService becomes a thin orchestrator.

Create suggested files:
src/common/access/company-access/company-access-resolver.service.ts
src/common/access/company-access/company-access-resolver.types.ts
src/common/access/company-access/company-access-resolver.module.ts
src/common/access/company-access/company-access-resolver.service.spec.ts

CompanyAccessResolver should own:

- loading active user access context
- selecting active company membership
- loading required membership/company include graph
- validating company status
- validating membership status
- validating subscription/company availability
- resolving accessible branch/unit context
- returning a normalized context object for AccessControlService

AccessControlService should still own:

- public methods
- auth/me payload assembly
- calling EntitlementService
- calling PermissionService
- calling SidebarBuilder
- guard helpers like hasPermission/assertCompanyContext if currently public

Do NOT:

- split Prisma queries yet
- introduce caching
- change subscription rules
- change onboarding rules
- change company switch behavior
- change branch behavior
- change auth/me output
- introduce new database tables
- introduce new APIs

Expected after Phase 5:
AccessControlService flow should look like:

const context = await companyAccessResolver.resolve(...)
const entitlements = entitlementService.resolve(...)
const permissions = permissionService.resolve(...)
const userModules = sidebarBuilder.build(...)
return auth payload

Tests:

- Add CompanyAccessResolver unit tests.
- Update AccessControlService tests.
- Ensure auth/me response unchanged.
- Ensure company switch still works.
- Ensure onboarding from Phase 0 still works.
- Ensure sidebar still works.

Run:
npm run typecheck
npm test -- --runInBand
npm test -- access-control.service.spec.ts company-access-resolver.service.spec.ts sidebar-builder.service.spec.ts permission.service.spec.ts entitlement.service.spec.ts onboarding.service.spec.ts --runInBand

Documentation:
Create:
docs/architecture/access-control-phase-5-company-access-resolver.md

Document:

- what moved
- what stayed in AccessControlService
- updated architecture
- remaining technical debt
- recommendation for Phase 6

Acceptance criteria:

- No schema changes
- No frontend changes
- No API response changes
- No behavior changes
- All tests pass
- AccessControlService is now mostly orchestration

Stop after Phase 5.
Do not continue to Phase 6.
