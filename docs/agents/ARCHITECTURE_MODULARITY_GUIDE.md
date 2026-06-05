# Architecture and Modularity Guide for Agents

This guide is for teammates and coding agents working on Gr8Books Lite. Read it before adding or moving code. The goal is to keep the backend and frontend modular, predictable, and easy to extend without creating duplicate utilities, services, components, types, or business rules.

## First Rule: Read Before Writing

Before creating a new file, helper, service, hook, mapper, DTO, component, table config, or constant:

1. Search for an existing implementation with `rg`.
2. Read the closest module files end to end.
3. Check `shared`, `common`, `utils`, `mappers`, `types`, `constants`, and reusable UI folders.
4. Reuse or extend existing patterns before creating a new abstraction.
5. If a feature belongs to an existing domain, place it in that domain instead of creating a new parallel structure.

Good search examples:

```bash
rg "Contact" gr8bookslite-frontend/app/src
rg "mapCompany" gr8bookslite-backend/src
rg "QueryKeys" gr8bookslite-frontend/app/src
rg "BillingCustomer" gr8bookslite-backend/src
```

Avoid creating files with almost the same purpose as existing ones. Redundancy is usually a sign that the current module was not read deeply enough.

## Project Boundaries

The project has two main apps:

```text
gr8bookslite-backend/
  src/
  prisma/
  docs/

gr8bookslite-frontend/
  app/
    src/
  docs/
```

Backend owns:

- Database schema and migrations.
- API modules, controllers, DTOs, services, guards, strategies, mappers, and domain rules.
- Provider integrations such as PayMongo, Supabase, Resend, Google OAuth, Redis/BullMQ, and Gemini.

Frontend owns:

- Routes, pages, UI composition, module tables, forms, hooks, services, local state, and client-side loading states.
- API client calls and React Query cache boundaries.
- Shared UI components and frontend-only constants.

Do not duplicate business rules in the frontend if the backend already owns the rule. Frontend validation is for user experience; backend validation is the authority.

## Backend Structure

Backend source follows this shape:

```text
src/
  common/
    access/
    decorators/
    enums/
    guards/
    interfaces/
    mappers/
    utils/
  modules/
    auth/
    billing/
    company/
    maintenance/
    master/
    onboarding/
    system-administration/
    users/
    workspace/
  prisma/
```

### Backend `common`

Use `src/common` only for code shared across multiple backend modules.

Use these folders intentionally:

- `common/utils`: Pure reusable helpers with no module-specific dependency.
- `common/mappers`: Shared response mappers used by more than one module.
- `common/interfaces`: Shared TypeScript interfaces.
- `common/enums`: Shared enums not owned by a single Prisma model or module.
- `common/guards`: Guards used by multiple modules.
- `common/access`: Shared access-control helpers and permission utilities.
- `common/decorators`: Nest decorators shared across controllers.

Examples of good `common/utils` candidates:

- Email normalization.
- Subscription access checks.
- Safe date or number parsing.
- Shared string parsing.

Do not put module-specific business logic in `common/utils`. If the helper only makes sense for billing, keep it in `modules/billing/utils`.

### Backend Modules

Each backend domain should live under `src/modules/<domain>`.

Recommended module structure:

```text
src/modules/<domain>/
  <domain>.module.ts
  <domain>.controller.ts
  <domain>.service.ts
  dto/
  mappers/
  services/
  strategies/
  types/
  utils/
```

Use each folder like this:

- `dto`: Request validation shapes. Use `class-validator` decorators here.
- `mappers`: Convert Prisma/provider/domain models to API response objects.
- `services`: Sub-services for provider calls, mail, storage, calculation, or complex domain operations.
- `strategies`: Swappable behavior, such as auth providers, billing providers, pricing strategies, or import/export strategies.
- `types`: Module-owned TypeScript types and include payload types.
- `utils`: Pure module-specific helpers.

Do not put Prisma result shaping directly in controllers. Controllers should stay thin.

### Backend Controller Rules

Controllers should:

- Own route paths and HTTP method mapping.
- Apply guards and decorators.
- Validate DTO input through Nest pipes.
- Call a service method and return its response.

Controllers should not:

- Contain Prisma queries.
- Contain provider API calls.
- Build complex response objects.
- Contain billing, permission, or tenant rules.

### Backend Service Rules

Services should:

- Own business rules.
- Coordinate Prisma, provider services, mappers, and domain helpers.
- Keep transactions short.
- Avoid external API calls inside Prisma interactive transactions.

When a flow needs both database writes and provider calls:

```text
1. Validate request and permissions.
2. Create local pending records in a short transaction.
3. Commit.
4. Call external provider outside the transaction.
5. Update local records in another short transaction.
6. If provider fails, mark local state as FAILED or PENDING instead of leaving half-written data.
```

### Backend Prisma Include Patterns

For repeated Prisma include/select objects, keep them in module utilities or types.

Example placement:

```text
src/modules/workspace/companies/utils/WorkspaceCompanyPrisma.util.ts
src/modules/billing/utils/BillingPrisma.util.ts
src/modules/users/types/user-with-memberships.type.ts
```

Use `satisfies Prisma.<Model>Include` or `satisfies Prisma.<Model>Select` so TypeScript catches wrong include shapes.

Good pattern:

```ts
export const CompanyDetailsInclude = {
  _count: {
    select: {
      memberships: true,
      units: true,
    },
  },
  units: {
    orderBy: [{ type: "asc" }, { createdAt: "asc" }],
  },
} satisfies Prisma.CompanyInclude;
```

Avoid copying include objects into multiple services. If two services need the same shape, move it to a shared module utility.

### Backend Mappers

Use mappers to keep API response shapes stable and avoid leaking raw Prisma/provider structures.

Mapper files should:

- Accept a typed source object.
- Return a plain response object.
- Normalize nulls, dates, enums, counts, provider payload details, and nested relations.

Good examples:

```text
src/modules/billing/mappers/
src/modules/onboarding/mappers/
src/common/mappers/
```

If a mapper is used by only one module, keep it in that module. Move it to `common/mappers` only after another module truly reuses it.

### Backend DTOs

DTOs should define input contracts only.

Rules:

- Keep request validation in DTO classes.
- Use shared validators/utilities where possible.
- Do not put database logic in DTOs.
- Do not use DTOs as response types unless the project already has that pattern in the module.

### Backend Types

Use `types` for module-owned TypeScript types:

- Prisma payload types.
- Provider response types.
- Service input/output types.
- Narrow type helpers.

If a type is shared across modules, move it to `common/interfaces` or a domain-neutral location.

### Backend Strategies

Use `strategies` when behavior can vary by provider, mode, account type, plan type, or workflow.

Good strategy candidates:

- Password login vs Google OAuth identity behavior.
- PayMongo vs fallback billing behavior.
- Monthly vs yearly pricing computation.
- Import parser by document type.

Do not introduce a strategy when one simple function is enough.

### Backend Access Control

Access control should be centralized and reusable.

Current direction:

- Platform-wide access belongs to auth/access-control services.
- Company and branch membership access should be resolved from backend data.
- Module visibility and actions should be driven by role/module permissions, not hardcoded UI checks.

Do not scatter permission checks across unrelated services. Create or reuse one access-control service/helper per boundary.

### Backend Migration Rules

Use Prisma migrations carefully:

- Never edit an applied migration unless the database has been reset or everyone agrees.
- Every migration folder must contain `migration.sql`.
- Commit migration folders with schema changes.
- If a migration was discarded locally but recorded in the database, either restore it or remove the database migration record intentionally in development.
- Read `docs/PRISMA_WORKFLOW.md` before changing schema.

## Frontend Structure

Frontend source follows this shape:

```text
app/src/
  agents/
  constants/
  data/
  hooks/
  services/
  types/
  ui/
```

The same domain usually appears across `constants`, `data`, `hooks`, `services`, `types`, and `ui`.

Example for workspace companies:

```text
app/src/constants/workspace/companies/
app/src/data/workspace/companies/
app/src/hooks/workspace/companies/
app/src/services/workspace/companies/
app/src/types/workspace/companies/
app/src/ui/workspace/companies/
```

Keep new code inside the matching domain path.

## Frontend Layer Responsibilities

### `ui`

Use `ui` for React components and visual composition.

Rules:

- Page-level components compose sections.
- Section components compose forms, tables, cards, dialogs, and actions.
- Repeated UI should move to a shared component or module-local component.
- UI should not directly call `fetch` unless that is already the established pattern for the module.

Shared UI belongs here:

```text
app/src/ui/shared/
```

Useful shared areas:

- `ui/shared/app`: App-wide dialog, loading, shell helpers.
- `ui/shared/module`: Reusable module surfaces.
- `ui/shared/module/module-table`: Reusable TanStack table structures.
- `ui/shared/account`: Account/profile/settings UI.
- `ui/shared/media`: Shared media/avatar/upload UI.

### `hooks`

Use hooks for page state, form state, React Query orchestration, and UI event handlers.

Rules:

- Keep hooks near their domain.
- Query keys must include tenant scope where needed.
- Do not fetch unrelated module data in a global hook.
- Do not mix UI rendering and API mapping inside hooks if it becomes large.

Tenant-scoped query keys should include:

```text
companyId
branchId or unitId
module key
filters
pagination
sort
```

Bad:

```ts
["users"]
```

Good:

```ts
["company-unit-users", companyId, unitId, filters, pagination]
```

### `services`

Use services for API calls and request/response handling.

Rules:

- Keep endpoint calls in domain services.
- Reuse shared API clients/interceptors instead of manually adding bearer tokens in every request.
- Keep service functions small and named by intent.
- Do not put React state in services.

Shared API helpers belong here:

```text
app/src/services/shared/api/
app/src/services/auth/
```

### `data`

Use `data` for static or semi-static frontend data structures:

- Draft storage helpers.
- Local storage helpers.
- Demo data only when the module is intentionally not wired yet.
- Shared domain data such as contact formatting.

Mock data should not remain after backend wiring. If mock data exists during development, label it clearly and remove it when the API is ready.

### `constants`

Use constants for stable configuration:

- Table columns.
- Status options.
- Select options.
- Module labels.
- Default filters.
- UI copy that is repeated within a module.

Do not put mutable backend data in constants.

### `types`

Use `types` for frontend-owned domain shapes:

- API response types if not already in service types.
- UI model types.
- Form model types.
- Table row types.

Avoid defining the same type in `data`, `hooks`, and `ui`. Prefer one exported type per domain.

## Frontend Reusable Utilities

Use shared utilities before creating new ones.

Examples:

- Contact formatting should use the shared contact data/constants/utilities.
- Date formatting should use an existing date helper if available.
- Media upload should use shared media helpers.
- Auth token/cookie logic should use auth services, not ad hoc local storage access.
- Module tables should use shared module-table components and TanStack patterns.

If a helper is needed in two or more modules, place it in the closest shared folder:

```text
app/src/services/shared/
app/src/hooks/shared/
app/src/data/shared/
app/src/constants/shared/
app/src/ui/shared/
```

Do not create generic helpers inside a feature module if another module already needs them.

## Frontend Loading Rules

Use two levels of loading:

1. App shell/context loading.
2. Module-level loading.

App shell loading should cover:

- Auth/session resolution.
- Active company and branch context.
- Permissions and navigation context.
- Company/branch switch transitions.

Module loading should cover:

- Table rows.
- Form details.
- Cards and summaries.
- Module-specific API data.

Do not make the global shell wait for every module query. Do not let module queries update shell identity such as company name, branch name, or navigation access.

## Cache and Query Rules

React Query cache keys must be scoped properly.

Include company and branch identifiers when data depends on them:

```ts
const queryKey = [
  "branch-users",
  activeCompanyId,
  activeUnitId,
  filters,
  pagination,
];
```

When switching company or branch:

- Cancel old tenant-scoped queries.
- Avoid reusing old company or branch data in navbar/sidebar.
- Keep global shell context separate from module query data.
- Let the current module load its own data after shell context is ready.

Do not fetch dashboard data from global layout hooks unless the user is actually on dashboard.

## Naming Rules

Use names that describe ownership and scope.

Backend examples:

```text
WorkspaceCompaniesService
BranchUsersService
BillingService
PaymongoService
CompanySubscription.mapper.ts
BillingPrisma.util.ts
```

Frontend examples:

```text
useWorkspaceCompanyManagement
WorkspaceCompanyService
WorkspaceCompanyQueryKeys
CompanyManagementAction
WorkspaceUserAssignmentsSection
```

Avoid vague names:

```text
Helper.ts
Utils.ts
Data.ts
NewComponent.tsx
CommonService.ts
```

If the file is reusable, name what it reuses. If it is domain-owned, include the domain.

## When to Create a New Folder

Create a new folder only when:

- The domain has multiple files with a clear boundary.
- The folder matches the existing project structure.
- The code is not better placed in an existing domain.

Do not create new top-level folders casually. Prefer these existing roots:

Backend:

```text
src/common/
src/modules/<domain>/
```

Frontend:

```text
app/src/constants/
app/src/data/
app/src/hooks/
app/src/services/
app/src/types/
app/src/ui/
```

## Where to Place Common Work

Use this table before adding files.

| Work | Backend Location | Frontend Location |
| --- | --- | --- |
| API endpoint | `src/modules/<domain>/<domain>.controller.ts` | Not applicable |
| Business rule | `src/modules/<domain>/<domain>.service.ts` or module service | Not authoritative; call backend |
| Request validation | `src/modules/<domain>/dto` | Form validation only |
| Response mapping | `src/modules/<domain>/mappers` or `src/common/mappers` | UI model mapper in domain service/hook if needed |
| Provider integration | `src/modules/<domain>/services` | Never directly unless provider is browser-only |
| Prisma include/select | `src/modules/<domain>/utils` or `types` | Not applicable |
| Pure shared helper | `src/common/utils` | `app/src/services/shared`, `hooks/shared`, or `data/shared` |
| Table columns | Not applicable | `app/src/constants/<domain>` |
| API client call | Not applicable | `app/src/services/<domain>` |
| React Query hook | Not applicable | `app/src/hooks/<domain>` |
| Shared component | Not applicable | `app/src/ui/shared` |
| Module page UI | Not applicable | `app/src/ui/<scope>/<domain>` |

## Redundancy Checklist

Before committing or handing off:

- Did you search for an existing version of this helper/component/service?
- Did you read the nearest module files, not just the file you edited?
- Did you place backend business rules in backend services?
- Did you keep controllers thin?
- Did you use DTOs for request validation?
- Did you use mappers for API responses?
- Did you use module `utils` or `common/utils` instead of inline repeated logic?
- Did you reuse shared contact/media/account/table helpers where applicable?
- Did React Query keys include company and branch scope where needed?
- Did you avoid global hooks fetching unrelated module data?
- Did you avoid external API calls inside Prisma transactions?
- Did you add or update tests for changed backend behavior?
- Did you remove mock data after wiring real backend data?

## Suggested Agent Workflow

Use this sequence for every task:

```text
1. Read the user request and identify the domain.
2. Search for existing files in backend and frontend.
3. Read the nearest service, hook, mapper, constants, types, and UI files.
4. Decide if the change belongs to backend, frontend, or both.
5. Update the smallest correct layer first.
6. Reuse existing shared helpers and components.
7. Add or update mappers/types/constants only when needed.
8. Run targeted tests, typecheck, lint, or manual QA.
9. Summarize changed files and remaining risks.
```

## Examples

### Adding Backend Support for a Workspace Module

Expected structure:

```text
src/modules/workspace/<feature>/
  <feature>.module.ts
  <feature>.controller.ts
  <feature>.service.ts
  dto/
  mappers/
  types/
  utils/
```

Register the module in the appropriate parent module. If the controller uses `JwtAuthGuard`, ensure the module imports the module that exports the guard dependencies, such as access-control services.

### Wiring a Frontend Workspace Module

Expected structure:

```text
app/src/services/workspace/<feature>/
app/src/hooks/workspace/<feature>/
app/src/constants/workspace/<feature>/
app/src/types/workspace/<feature>/
app/src/ui/workspace/<feature>/
```

Use the shared API client and query keys. Remove mock data once backend data is available.

### Adding a Reusable Dialog

If used in one page only:

```text
app/src/ui/workspace/<feature>/<FeatureDialog>.tsx
```

If used across modules:

```text
app/src/ui/shared/app/
```

Do not duplicate a dialog that already exists in `AppDialog.tsx` or another shared app component.

### Adding Contact Number Logic

Before creating anything new, check:

```text
app/src/data/shared/contact/
app/src/constants/shared/contact/
```

Use existing contact formats/constants so every module handles contact numbers consistently.

## Final Rule

Prefer one well-placed reusable implementation over many small duplicated implementations. If you are unsure where code belongs, read more of the nearby module before creating a new abstraction.
