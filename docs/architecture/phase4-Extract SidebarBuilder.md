# Phase 4 — Extract SidebarBuilder (Behavior-Preserving Refactor)

You are continuing the architectural refactor of Gr8Books Neo.

Read the current implementation first before writing any code.

Do not rewrite existing working logic.

Do not redesign the system.

Continue from the current architecture exactly where Phase 3 stopped.

---

# Current Architecture

Current ownership:

AccessControlService
├── Load authenticated user
├── Resolve active company
├── Resolve membership
├── Validate subscription/company state
├── EntitlementService
├── PermissionService
├── Sidebar generation
└── Return AuthUser

Phase 3 successfully extracted:

- EntitlementService
- PermissionService

AccessControlService is now primarily an orchestrator except it still owns every sidebar-related responsibility.

That is the remaining architectural debt.

---

# Objective

Extract every sidebar generation responsibility into a dedicated service named:

SidebarBuilder

This phase is a pure architecture refactor.

There must be ZERO behavior changes.

The frontend must not notice any difference.

The API response must remain identical.

The database schema must remain unchanged.

The JSON response from /auth/me must remain identical.

---

# Why We Are Doing This

The long-term architecture of Gr8Books Neo is:

Platform Metadata
│
▼
EntitlementService
│
▼
PermissionService
│
▼
SidebarBuilder
│
▼
User Sidebar Preferences
│
▼
Frontend

Today AccessControlService still owns the sidebar.

It should not.

Sidebar generation is a separate responsibility.

This phase introduces that separation.

---

# Responsibilities To Move

Move every sidebar-related responsibility from AccessControlService.

Examples include:

- buildSidebar()

- buildChildren()

- buildSection()

- buildLink()

- buildUserModules()

- recursive sidebar tree creation

- system sidebar mapping

- company sidebar mapping

- branch sidebar mapping

- missing module fallback

- permission filtering

- entitlement filtering

- enabled module filtering

- sidebar sorting

- module visibility decisions

- recursive child processing

- any helper used only for sidebar generation

If a private helper exists solely for sidebar generation, move it.

Do not duplicate logic.

---

# SidebarBuilder Responsibilities

SidebarBuilder becomes the single owner of:

Input:

- membership

- enabled module records

- enabled module codes

- permissions

- company sidebar rows

- module sidebar rows

- system sidebar template

- branch information

Output:

Exactly the existing

userModules

object.

Nothing else.

---

# AccessControlService After Refactor

After this phase it should look conceptually like:

AccessControlService

↓

Load User

↓

Resolve Membership

↓

EntitlementService

↓

PermissionService

↓

SidebarBuilder

↓

Return AuthUser

AccessControlService should no longer know HOW a sidebar is built.

It only requests one.

---

# DO NOT CHANGE

Do NOT redesign sidebar architecture.

Do NOT redesign database tables.

Do NOT redesign company_modules.

Do NOT redesign permissions.

Do NOT redesign entitlements.

Do NOT redesign onboarding.

Do NOT redesign provisioning.

Do NOT redesign authentication.

Do NOT redesign login.

Do NOT redesign subscriptions.

Do NOT redesign plan modules.

Do NOT redesign module systems.

Do NOT redesign company sidebar tables.

Do NOT redesign user modules.

Do NOT redesign frontend.

Do NOT redesign API responses.

---

# Absolutely Forbidden

Do NOT implement:

- customizable sidebar

- favorites

- hidden menu

- pinned menu

- drag and drop

- reorder

- personalization

- sidebar preference persistence

- caching

- redis

- new database tables

- new APIs

- query optimization

- schema migration

Those belong to later phases.

---

# Folder Structure

Create:

src/common/access/sidebar/

Inside create:

sidebar-builder.service.ts

sidebar-builder.types.ts

sidebar-builder.module.ts

sidebar-builder.service.spec.ts

Register the module similarly to:

EntitlementModule

PermissionModule

Inject SidebarBuilder into AccessControlService.

---

# Refactoring Rules

This is extraction only.

Do NOT rewrite working algorithms.

Move code.

Rename only when necessary.

Reduce duplication only when it naturally appears during extraction.

Keep all existing behavior.

If helper methods are tightly coupled, move them together.

---

# Unit Tests

Create dedicated SidebarBuilder tests.

Update existing AccessControlService tests.

All existing tests must continue passing.

Run:

npm run typecheck

npm test -- --runInBand

Both must pass.

---

# Documentation

Create:

docs/architecture/access-control-phase-4-sidebar-builder.md

Document:

- Responsibilities moved

- Responsibilities remaining

- Updated architecture

- Technical debt remaining

- Recommendation for Phase 5

---

# Success Criteria

The architecture after Phase 4 should be:

AccessControlService
│
├── EntitlementService
│
├── PermissionService
│
├── SidebarBuilder
│
└── AuthUser

SidebarBuilder

↓

Build sidebar tree

↓

Filter by entitlements

↓

Filter by permissions

↓

Generate userModules

↓

Return final sidebar

AccessControlService should contain almost no sidebar logic.

The frontend should not require a single code change.

The API response must remain byte-for-byte compatible with the current implementation.

---

# Stop Conditions

Stop immediately after:

✓ SidebarBuilder extracted

✓ Tests passing

✓ Typecheck passing

✓ Documentation created

Do not continue into Phase 5.

Do not begin implementing sidebar customization.

Do not begin redesigning persistence.

Wait for review before proceeding to the next phase.
