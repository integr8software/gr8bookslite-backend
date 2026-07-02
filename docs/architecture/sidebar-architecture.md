We need to rethink the Gr8Books Neo sidebar architecture before implementing another repair/reconciliation layer.

Important:
DO NOT implement yet.
DO NOT create migrations yet.
DO NOT modify production logic yet.
Create an architecture analysis and implementation plan first.

Current issue:
We previously considered a UserAccessReconciler to repair missing materialized sidebar rows. However, that approach started becoming too complex and risks creating a God Service. It may also require raw SQL and repeated repair logic just to keep copied sidebar rows in sync.

We want to evaluate a cleaner architecture:

Instead of storing a full materialized sidebar per user/company/branch, generate the sidebar dynamically from:

1. Platform metadata
   - modules
   - permissions
   - module systems
   - sidebar templates

2. Runtime access state
   - company modules
   - memberships
   - membership unit access
   - role permissions
   - permission overrides
   - branch/company context

3. User preferences only
   - hidden items
   - collapsed state
   - custom sort/order
   - pinned/favorite items
   - maybe custom labels later

Core idea:
The backend should not need to “repair missing sidebars” because the sidebar should be computed from canonical source data at runtime.

Only user preferences should be persisted.

Please analyze and design a migration plan for this architecture.

Tasks:

1. Inspect current sidebar-related code:
   - PlatformModuleSidebar model/table
   - ModuleSystemSidebar
   - materializeDefaultUserSidebar
   - UserSidebarService
   - AccessControlService
   - AuthService.buildAuthenticatedResponse
   - /auth/me response shape
   - frontend sidebar rendering
   - sidebar customization UI
   - provisioning scripts
   - verifyPermissionArchitecture.ts

2. Document current problems with materialized full sidebar rows:
   - stale copied data
   - missing rows for new users
   - need for runtime repair
   - duplicated source of truth
   - difficulty with new modules
   - difficulty preserving customization
   - staging/local inconsistency

3. Propose a new architecture:
   - Keep ModuleSystemSidebar as the platform default navigation template.
   - Keep modules/permissions/company modules as access source of truth.
   - Replace full per-user materialized sidebar dependency with dynamic sidebar generation.
   - Persist only user sidebar preferences/customizations.
   - Runtime sidebar response should be computed by:
     ModuleSystemSidebar template
     - enabled company modules
     - resolved user permissions
     - active branch/company access
     - user preferences

4. Decide what to do with existing PlatformModuleSidebar:
   - Can it be reused as a preference table?
   - Should it be renamed/replaced later?
   - Should we introduce a new UserSidebarPreference model instead?
   - What migration path is safest?
   - How can existing customized rows be converted to preferences?

5. Design the new runtime flow:
   - /auth/me
   - company switch
   - branch switch
   - sidebar customization GET/PUT/reset
   - onboarding completion
   - workspace user assignment
   - invitation activation
   - Google OAuth login/registration

6. Design the preference model.
   It should support at least:
   - userId
   - companyId
   - branchUnitId or nullable/global scope
   - module/sidebar item key
   - hidden
   - collapsed
   - sortOrder
   - parent/group override if currently supported
   - pinned/favorite if easy to support later
   - timestamps

7. Explain how default sidebar rendering works when no preferences exist.
   A new user with valid company/branch access should immediately see the correct sidebar without needing materialization.

8. Explain how customization works:
   - default sidebar is computed
   - user changes are stored as preferences
   - rendering applies preferences on top of defaults
   - reset deletes preferences instead of rebuilding full sidebar rows

9. Explain how new modules should behave:
   - default users see new modules automatically if they have access
   - customized users either see new modules in default location or in an "available modules" customization area
   - no repair script should be required

10. Explain how verification should change:

- no need to verify every user has materialized sidebar rows
- verify platform templates exist
- verify module-permission relationships
- verify company module entitlements
- verify preference records do not reference missing modules/template keys

11. Explain what provisioning should own:

- platform metadata only
- module templates
- permissions
- reference data
  It should not provision per-user sidebar rows.

12. Create a phased migration plan:
    Phase 1:

- Add dynamic sidebar builder while keeping old data intact.
- Add tests proving new users get sidebar without materialized rows.
  Phase 2:
- Switch /auth/me and sidebar endpoints to dynamic builder.
- Store customizations as preferences.
  Phase 3:
- Migrate existing PlatformModuleSidebar customizations into preferences.
- Deprecate old full materialized sidebar usage.
  Phase 4:
- Remove or archive old materialized sidebar dependency.

13. Add risk analysis:

- performance impact of computing sidebar dynamically
- caching options
- compatibility with current frontend
- migration risk for customized users
- permission correctness risk
- rollback plan

14. Create documentation:
    docs/architecture/dynamic-sidebar-preferences-plan.md

The document should include:

- current architecture
- proposed architecture
- source of truth
- data model proposal
- runtime flow
- migration plan
- verification changes
- risks
- recommended implementation sequence

Important:
This is analysis/design only.
Do not implement code yet.
After the document is created, summarize:

- recommended architecture
- files inspected
- suggested migration phases
- open questions before implementation
