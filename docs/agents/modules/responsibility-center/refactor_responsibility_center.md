You are working on Gr8Books Neo, an ERP system using:

- Frontend: Next.js 16 with TypeScript
- Backend: NestJS with TypeScript
- ORM: Prisma
- Database: PostgreSQL
- Architecture: multi-company and multi-branch SaaS
- Existing responsibility center functionality already exists and must be refactored safely

Your task is to analyze and refactor the existing Responsibility Center module.

Do not immediately assume the current implementation is correct or replace it blindly. First inspect the existing database schema, Prisma models, migrations, backend modules, DTOs, validation, services, controllers, frontend pages, forms, tables, selectors, transaction tagging, reporting integrations, audit logging, and permission checks related to responsibility centers.

Use the existing project conventions and architecture. Avoid duplicate services, duplicate models, parallel implementations, unnecessary abstraction, or over-engineering.

Main Objective

Refactor the Responsibility Center setup so that it follows this hierarchy:

Classification
↓
Type
↓
Responsibility Center

The module must clearly separate:

1. Responsibility Center Classification
   - Defines the accounting and management behavior.
2. Responsibility Center Type
   - Defines the organizational category under a classification.
3. Responsibility Center
   - Defines the actual center used in transactions and reports.

The refactor must preserve the existing multi-dimensional responsibility center design, where one transaction may be tagged with multiple dimensions such as:

Branch: Cavite
Department: Sales
Project: Mall Renovation
Sales Team: Team A
Business Unit: Retail

Do not redesign the system into a single responsibility center per transaction.

Existing Reference

Review the uploaded or repository documentation named:

RESPONSIBILITY_CENTER_INSTRUCTIONS.md

Use it as the functional reference for:

- Multi-dimensional transaction tagging
- Header-level and line-level assignments
- Parent-child hierarchy
- Historical reporting
- Custom responsibility center types
- Required or optional dimensions
- Reporting filters and rollups
- Inactive center behavior
- Prevention of deletion when already used

The new requirements below refine and extend that document.

Required Classifications

The system should support these standard classifications:

Cost Center
Revenue Center
Profit Center
Investment Center

Recommended system codes:

CC = Cost Center
RC = Revenue Center
PC = Profit Center
IC = Investment Center

Classification accounting behavior:

Cost Center:

- Tracks expenses
  Revenue Center:
- Tracks revenue
  Profit Center:
- Tracks revenue and expenses
  Investment Center:
- Tracks revenue, expenses, and assets

These standard classifications should be system-managed and should not be casually deleted.

Analyze whether custom classifications are currently supported. Do not remove existing flexibility without documenting the impact.

Responsibility Center Type Rules

A Responsibility Center Type must belong to a classification.

Examples:

Cost Center

- Department
- Warehouse
- Administrative Unit
- Support Unit
  Revenue Center
- Sales Team
- Sales Territory
- E-Commerce Channel
- Call Center
  Profit Center
- Branch
- Outlet
- Business Unit
- Division
  Investment Center
- Manufacturing Plant
- Regional Office
- Business Unit

Types must remain configurable per company where appropriate.

Each type should support at least:

id
companyId
classificationId
name
codePrefix
description
sortOrder
isRequired
status
createdAt
createdBy
updatedAt
updatedBy

Use the repository’s existing naming conventions and audit field conventions instead of forcing these exact names.

Validation requirements:

- Type name must be unique within the appropriate company and classification scope.
- Type must reference a valid classification.
- Inactive types must not be available when creating new responsibility centers.
- Types already used by responsibility centers or transactions must not be hard-deleted.
- A type may be deactivated using soft-deactivation.
- Existing historical records must remain valid.
- Type code prefix must be validated and normalized.
- Changing the classification of a type already used by responsibility centers must be prevented or handled through a safe migration process.

Responsibility Center Form Refactor

Rearrange the create and edit form in this order:

1. Classification
2. Type
3. Name
4. Code
5. Parent Responsibility Center
6. Manager
7. Status

Preserve other existing valid fields when necessary.

Classification Field

Classification must be selected first.

When creating a record, Type should be disabled until a classification is selected.

Type Field

The Type dropdown must only show active types assigned to the selected classification.

Example:

Selected Classification: Revenue Center
Allowed types:

- Sales Team
- Sales Territory
- E-Commerce Channel
- Call Center

Do not display unrelated types from Cost Center, Profit Center, or Investment Center.

When the classification changes:

- Clear the currently selected Type if it no longer belongs to the new classification.
- Revalidate the parent selection.
- Recalculate the suggested code.
- Do not silently preserve an invalid combination.

The backend must independently enforce the same relationship. Do not rely only on frontend filtering.

Dynamic Name Label

The visible label of the Name field must change based on the selected classification.

Examples:

Cost Center Name
Revenue Center Name
Profit Center Name
Investment Center Name

The database property may remain a neutral field such as:

name

Do not create separate database columns such as:

costCenterName
revenueCenterName
profitCenterName
investmentCenterName

The dynamic label is a presentation concern.

When no classification is selected, display:

Responsibility Center Name

Automatic Code Generation

The Responsibility Center code should be generated from:

Classification Prefix + Type Prefix + Sequence

It must not be generated from the responsibility center name.

Examples:

Profit Center + Business Unit
PC-BU-001
Profit Center + Branch
PC-BR-001
Cost Center + Department
CC-DEPT-001
Revenue Center + Sales Team
RC-ST-001
Investment Center + Manufacturing Plant
IC-PLANT-001

Do not use only:

PC-BU

because multiple responsibility centers may use the same classification and type.

Implement a safe sequence strategy that works correctly with:

- Multiple companies
- Concurrent requests
- Multiple users creating records simultaneously
- Existing responsibility center codes
- Manual code overrides
- Transaction rollbacks

Avoid a race-prone implementation based only on:

count + 1

or:

find latest code, then increment

without database-level protection.

Use the project’s existing sequence or numbering framework when one exists. If no reusable framework exists, implement the smallest safe solution using a database transaction and unique constraint.

Recommended uniqueness scope:

companyId + code

Confirm the appropriate scope from the existing SaaS architecture.

Manual Code Input

The user must still be allowed to manually enter or override the generated code.

Recommended UI behavior:

Automatically generate code: enabled by default

When automatic generation is enabled:

- Generate or suggest the code after Classification and Type are selected.
- Avoid overwriting a manually changed code without user intent.
- On edit, do not regenerate an existing code automatically.

When automatic generation is disabled:

- Allow manual input.
- Validate required format and uniqueness.
- Normalize whitespace and casing based on existing conventions.

Backend rules:

- Code is required.
- Code must be unique within its intended company scope.
- Manual codes must pass the same validation.
- Duplicate code failures must return a clear domain validation error.
- Posted transaction references must not depend on the center name.
- Code changes must not destroy historical transaction relationships.

Before allowing the code of a responsibility center already used in posted transactions to change, inspect current project behavior and choose one of these safe approaches:

1. Prevent the code from being changed after transactional use.
2. Allow controlled changes while preserving references by immutable ID and audit history.

Prefer the approach most consistent with the existing system.

Parent-Child Hierarchy

Responsibility Centers may have parents and children.

Example:

Retail Division
└── Cavite Branch
├── Accounting Department
├── Warehouse
└── Sales Team A

Preserve hierarchical reporting and rollup support.

Backend validation must prevent:

- A center from being its own parent.
- Circular parent-child relationships.
- Selecting an inactive parent.
- Selecting a parent from another company.
- Cross-tenant hierarchy.
- Invalid parent assignments caused by classification or type changes.
- Moving a parent under one of its own descendants.

Use a transactional and reliable cycle-detection approach.

Do not rely only on frontend validation.

Analyze whether parent-child classification combinations should be restricted. Do not invent rigid hierarchy rules unless the existing system or business requirements already define them.

At minimum, ensure the hierarchy is structurally valid.

Deactivation Behavior

Responsibility Center deactivation must use soft-deactivation.

When a Responsibility Center is deactivated:

- The selected center becomes inactive.
- All active children become inactive.
- All active descendants become inactive recursively.
- Historical transactions remain unchanged.
- Existing reports retain the historical assignments.
- Foreign keys must not be cleared.
- Records must not be deleted.
- The inactive center and descendants must not be selectable in new transactions.
- Existing posted records must remain queryable.
- Historical report filters must still be able to include inactive centers.

The recursive deactivation must run in one database transaction.

If any descendant update fails, the entire operation must roll back.

Record audit information for all affected centers using the project’s existing audit pattern.

Examples of useful audit information:

status changed from Active to Inactive
deactivatedBy
deactivatedAt
reason
cascade source responsibility center

Use the existing audit logging system where available instead of creating a second audit framework.

Deactivation Confirmation

When the selected center has active descendants, show a confirmation message similar to:

This Responsibility Center has 8 active child or descendant centers.
Deactivating this center will also deactivate all active descendants.
Historical transactions and reports will not be deleted or changed.
Do you want to continue?

The backend should return or expose enough information for the frontend to show how many descendants will be affected.

A preview endpoint is acceptable only if it fits the current API style. Avoid adding an endpoint when the same result can be returned safely through an existing detail or validation endpoint.

Reactivation Behavior

Reactivating a parent must not automatically reactivate all children.

Default behavior:

Reactivate only the selected Responsibility Center.

Reason:

Some descendants may have already been intentionally inactive before the parent was deactivated.

Optional future behavior may allow selected descendants to be reactivated, but do not implement unnecessary bulk-reactivation UI unless the existing requirements already need it.

When reactivating a child:

- Validate that its required parent hierarchy is valid.
- Decide whether an inactive parent should block reactivation.
- Prefer blocking child reactivation when its parent is inactive, unless the current architecture supports active children under inactive parents.

Document the chosen behavior.

Transaction Entry Behavior

Preserve existing multi-dimensional tagging.

The system must continue supporting:

- Multiple responsibility center dimensions on one transaction.
- Header-level assignment.
- Line-level assignment.
- Defaulting line values from the header.
- Different centers for different transaction lines.
- Required types before save or posting.
- Historical assignments after posting.
- Filtering active centers for new transactions.
- Retaining inactive centers in existing transactions.
- Company and branch isolation.

When loading selectors for new transactions:

- Only show active responsibility centers.
- Only show active types and valid classifications.
- Respect company context.
- Respect branch context where applicable.
- Respect permissions.
- Do not remove values from an existing posted transaction simply because the center later became inactive.

Reporting Requirements

Preserve reporting support for:

- Department
- Branch
- Project
- Salesperson
- Business Unit
- Warehouse
- Region
- Responsibility Center
- Parent rollups
- Multiple dimensions combined

Examples:

Income Statement by Branch
Trial Balance by Department
Expenses by Project
Sales by Salesperson
Profit by Business Unit
Budget vs Actual by Department
Sales by Profit Center
Revenue by Team
ROI by Investment Center

Historical reporting must remain accurate when a center is:

- Renamed
- Deactivated
- Moved under another parent
- Assigned a new manager
- Given a changed code, if code editing is allowed

Inspect how existing reports currently resolve names and hierarchy.

Do not introduce snapshot tables unless the current data model genuinely requires them. First determine whether immutable foreign keys plus audit or effective-dated hierarchy are sufficient.

Document any historical reporting limitation discovered during analysis.

Suggested Data Model Direction

Analyze the current Prisma schema before deciding the final structure.

A normalized target may resemble:

ResponsibilityCenterClassification
ResponsibilityCenterType
ResponsibilityCenter
TransactionResponsibilityCenterAssignment

Possible Classification fields:

id
companyId or system scope
code
name
trackingBehavior
isSystem
status
createdAt
updatedAt

Possible Type fields:

id
companyId
classificationId
name
codePrefix
description
sortOrder
isRequired
status
createdAt
createdBy
updatedAt
updatedBy

Possible Responsibility Center fields:

id
companyId
typeId
code
name
parentId
managerId
status
deactivatedAt
deactivatedBy
createdAt
createdBy
updatedAt
updatedBy

Prefer deriving classification through:

ResponsibilityCenter
→ ResponsibilityCenterType
→ ResponsibilityCenterClassification

Avoid storing both:

responsibilityCenter.classificationId
responsibilityCenter.type.classificationId

unless there is a proven reporting or performance reason.

If classification is stored redundantly, enforce consistency at the backend and database level where possible.

Database and Prisma Requirements

Inspect all existing Responsibility Center migrations before changing the schema.

Do not edit already-applied migration files.

Create new forward-only Prisma migrations.

Migration requirements:

- Preserve all existing responsibility center records.
- Preserve transaction relationships.
- Preserve company ownership.
- Preserve branch ownership where relevant.
- Map existing types and classifications safely.
- Avoid destructive table recreation when possible.
- Do not reset the database.
- Do not use prisma migrate dev against staging or production.
- Ensure the migration can be deployed using the project’s guarded migration workflow.
- Add unique constraints and indexes required for filtering and code generation.
- Add foreign key constraints where safe.
- Prevent cross-company relationships at the application layer and database layer where practical.
- Provide a data migration or seed strategy for existing classifications and types.
- Make the migration idempotent where custom SQL is required.
- Document rollback considerations, even though Prisma migrations are forward-moving.

Before generating a migration, inspect whether the project uses:

prisma.config.ts
scripts/run-with-env.cjs
database guard scripts
APP_ENV
DATABASE_GUARD_HOSTS

Follow the current database safety workflow.

Existing Data Migration

Create a clear mapping strategy for existing records.

Possible mapping examples:

Existing type: Cost Center
→ Classification: Cost Center
→ Type: Department or General Cost Center
Existing type: Profit Center
→ Classification: Profit Center
→ Type: Branch, Business Unit, or General Profit Center

Do not guess mappings silently.

When existing data does not contain enough information to infer the new Type:

- Use a safe fallback type such as General.
- Create one fallback type per classification when appropriate.
- Preserve the original value in audit notes or migration documentation.
- Produce a migration report listing records that used fallback mappings.

Do not block the whole migration merely because some historical records are ambiguous.

API Requirements

Use the existing API versioning convention.

Inspect whether current routes use:

/api/v1

Follow the existing controller and module patterns.

Possible API capabilities include:

List classifications
List active types filtered by classification
Create responsibility center
Update responsibility center
Preview descendant impact
Deactivate responsibility center with descendants
Reactivate one responsibility center
List active centers for transaction selectors
List all centers including inactive for reports

Do not create duplicate routes when existing endpoints can be safely extended.

Backend validation must include:

- Tenant/company scope.
- Classification and Type compatibility.
- Active Type requirement.
- Unique code.
- Parent ownership.
- Circular hierarchy prevention.
- Inactive parent restriction.
- Safe status transitions.
- Descendant cascading.
- Historical usage restrictions.
- Permission checks.
- Audit logging.

Use proper NestJS exceptions and the project’s standard response format.

Avoid exposing raw Prisma errors.

Frontend Requirements

Follow the existing frontend architecture and component library.

Update:

- Responsibility Center list page
- Create form
- Edit form
- Classification dropdown
- Filtered Type dropdown
- Dynamic Name label
- Automatic/manual Code behavior
- Parent selector
- Status toggle
- Deactivation confirmation
- Validation messages
- Loading and error states
- Existing transaction selectors where necessary

UX behavior:

- Classification comes before Type.
- Type is disabled until Classification is selected.
- Type options refresh when Classification changes.
- Invalid previous Type selection is cleared.
- Name label updates immediately.
- Code suggestion appears only after Classification and Type are valid.
- Existing code is not overwritten during edit.
- User can manually override a generated code.
- Deactivation clearly states that descendants will also be deactivated.
- Historical usage is clearly preserved.
- Inactive centers are visually distinguishable on maintenance and report screens.
- Inactive centers are excluded from new transaction selectors.

Use React Hook Form, Zod, TanStack Query, server actions, Zustand, or other tools only according to existing project conventions. Do not introduce a parallel form or state-management library.

Permissions and Security

Inspect the current permissions for:

- View Responsibility Centers
- Create Responsibility Center
- Edit Responsibility Center
- Activate or deactivate Responsibility Center
- Manage classifications
- Manage types
- View historical or inactive centers

Do not weaken existing authorization.

All backend endpoints must enforce authorization even if the frontend hides controls.

Ensure strict company isolation.

A user from Company A must never:

- View Company B responsibility centers.
- Select Company B parents.
- Use Company B codes or sequences.
- Modify Company B classifications or types.
- Tag Company B centers in transactions.

Audit Requirements

Use the existing audit logging mechanism.

Audit at least:

- Creation
- Classification change
- Type change
- Name change
- Code change
- Parent change
- Manager change
- Activation
- Deactivation
- Cascade deactivation
- Manual code override

For cascading deactivation, record:

- The original parent that triggered the cascade.
- The user performing the action.
- Affected center IDs.
- Previous and new status.
- Timestamp.

Do not expose internal audit details unnecessarily in normal API responses.

Testing Requirements

Add or update tests using the existing testing stack.

Backend unit and integration test cases:

1. Classification list returns expected active classifications.
2. Type list is filtered by classification.
3. A Type cannot be used with the wrong classification.
4. Code is generated from Classification and Type, not Name.
5. Two centers under the same classification and type receive unique sequences.
6. Concurrent creation cannot produce duplicate codes.
7. Manual code override is accepted when unique.
8. Duplicate manual code is rejected.
9. A center cannot be its own parent.
10. Circular hierarchy is rejected.
11. Cross-company parent is rejected.
12. Inactive parent cannot be selected.
13. Deactivating a parent deactivates all descendants.
14. Cascade runs in one database transaction.
15. Historical assignments remain after deactivation.
16. Inactive centers are excluded from new transaction selectors.
17. Inactive centers remain available in historical reports.
18. Reactivating a parent does not automatically reactivate children.
19. Unauthorized users cannot deactivate or edit centers.
20. Company isolation is enforced.
21. Existing transactions remain valid after migration.
22. Type deactivation does not corrupt existing responsibility centers.
23. Changing a used Type’s classification is rejected.
24. Code is not regenerated unexpectedly during edit.

Frontend test cases:

1. Type is disabled until Classification is selected.
2. Type options are filtered by Classification.
3. Changing Classification clears an invalid Type.
4. Name label changes dynamically.
5. Code suggestion uses Classification and Type prefixes.
6. Manual code remains unchanged after user override.
7. Edit form does not overwrite an existing code.
8. Deactivation confirmation displays descendant count.
9. Inactive centers are hidden from new transaction selectors.
10. Validation errors are understandable.

Run the project’s existing checks:

npm ci
prisma validate
prisma generate
typecheck
lint
unit tests
build

Use the repository’s exact package scripts.

Required Implementation Process

Follow this order.

Phase 1: Analysis

Inspect the current implementation and produce:

docs/modules/responsibility-center/responsibility-center-refactor-analysis.md

The analysis must contain:

- Current database models.
- Current relationships.
- Current transaction tagging model.
- Current API routes.
- Current frontend pages and components.
- Current permissions.
- Current reporting dependencies.
- Current status and deletion behavior.
- Current code-generation behavior.
- Current hierarchy validation.
- Risks and compatibility concerns.
- Files expected to change.
- Existing functionality that must remain untouched.
- Data migration risks.
- Recommended normalized schema.
- Whether classification is currently mixed with Type.
- Whether existing records can be mapped automatically.

Do not modify production code before completing the analysis.

Phase 2: Implementation Plan

Create:

docs/modules/responsibility-center/responsibility-center-refactor-implementation-plan.md

The plan must contain:

- Final target architecture.
- Prisma changes.
- Migration strategy.
- Data mapping strategy.
- Backend changes.
- Frontend changes.
- Transaction integration changes.
- Reporting compatibility.
- Audit changes.
- Permission changes.
- Testing strategy.
- Deployment order.
- Rollback and recovery considerations.

Keep the solution proportional to the requirement.

Do not introduce microservices, event sourcing, CQRS, or a new generic metadata framework unless the current architecture already uses them and they are genuinely needed.

Phase 3: Implementation

After analysis and planning, implement the refactor.

Implementation must include:

- Safe Prisma schema changes.
- New migration files.
- Existing data migration.
- Backend DTO and validation updates.
- Service logic.
- Controller updates.
- Safe automatic code generation.
- Parent-child validation.
- Recursive transactional deactivation.
- Reactivation behavior.
- Frontend form updates.
- Dynamic labels.
- Filtered Type dropdown.
- Manual code override.
- Confirmation UI.
- Transaction selector filtering.
- Reporting compatibility.
- Audit logging.
- Permissions.
- Tests.
- Documentation.

Phase 4: Verification Report

Create:

docs/modules/responsibility-center/responsibility-center-refactor-verification.md

Include:

- Files changed.
- Migration created.
- Existing data migration result.
- Number of records mapped automatically.
- Number of records assigned fallback types.
- API routes changed.
- UI changes.
- Tests added.
- Commands executed.
- Test results.
- Build result.
- Prisma validation result.
- Known limitations.
- Manual QA checklist.
- Deployment instructions.
- Post-deployment checks.

Important Constraints

Do not:

- Delete historical Responsibility Center records.
- Remove transaction assignments.
- Convert the system into one-center-per-transaction.
- Hard-delete used types or classifications.
- Generate codes from the Name field.
- Show all Types regardless of Classification.
- Automatically reactivate descendants.
- Overwrite manually entered codes unexpectedly.
- Use count + 1 as an unsafe sequence generator.
- Allow circular hierarchy.
- Allow cross-company parents.
- Clear responsibility center foreign keys during deactivation.
- Edit old applied migration files.
- Reset any shared, staging, or production database.
- Bypass the project’s database guard.
- Add duplicate modules or duplicate APIs.
- Replace existing working architecture without documented reason.
- Add unnecessary complexity.

Expected Final Result

The completed module should behave as follows:

User selects Classification
→ System filters available Types
→ User selects Type
→ Name label changes according to Classification
→ System suggests a Code based on Classification + Type + Sequence
→ User may retain or manually override the Code
→ Backend validates Classification and Type compatibility
→ Center may be placed in a safe parent-child hierarchy
→ Deactivating a parent deactivates all descendants
→ Historical records remain untouched
→ Inactive centers cannot be tagged in new transactions
→ Existing multi-dimensional transaction tagging remains fully supported

At the end, provide a concise summary grouped by:

DATABASE
BACKEND
FRONTEND
MIGRATION
TESTING
DOCUMENTATION
RISKS OR FOLLOW-UPS

Do not claim completion unless Prisma validation, type checking, tests, and build have actually been executed successfully. Clearly disclose any check that could not be executed.
