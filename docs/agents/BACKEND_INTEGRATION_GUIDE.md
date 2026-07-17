# Backend Integration Guide for Agents

This guide explains how to wire backend features so the frontend can consume
them cleanly. It is based on the frontend module rules, the frontend map, and
the architecture/modularity guide. Read it before adding or changing API
contracts, service methods, DTOs, mappers, Prisma shapes, seed data, or
frontend service integrations.

## First Rule: Integrate By Contract

Backend integration work starts with the API contract, not with UI mock data.

Before writing code:

1. Identify the frontend route, module, and feature path.
2. Identify the backend domain that owns the business rule.
3. Search both apps for existing contracts, mappers, DTOs, services, and
   frontend API calls.
4. Read the closest frontend hook, service, constants, types, and UI files.
5. Read the closest backend controller, service, DTO, mapper, Prisma include,
   seed, and permission files.
6. Reuse existing shared utilities and module patterns before creating a new
   abstraction.

Useful searches:

```bash
rg "FeatureName" gr8bookslite-frontend/app/src
rg "FeatureName" gr8bookslite-backend/src
rg "QueryKeys" gr8bookslite-frontend/app/src
rg "Controller" gr8bookslite-backend/src/modules/<domain>
rg "mapper" gr8bookslite-backend/src/modules/<domain>
```

Do not add a parallel backend endpoint or frontend service if an existing one
can be safely extended.

## App Boundary

Backend owns:

- Database schema, migrations, Prisma queries, and transactions.
- API endpoints, DTO validation, response mapping, permissions, guards, and
  domain rules.
- Provider integrations such as PayMongo, Supabase, Resend, Google OAuth,
  Redis/BullMQ, and Gemini.
- Platform provisioning and company bootstrap data required for runtime.

Frontend owns:

- Next.js routes, pages, UI composition, forms, module tables, loading states,
  and client-side validation for user experience.
- API client calls through shared services.
- React Query cache keys, invalidation, and tenant-aware fetch orchestration.
- Frontend-only constants, UI types, table config, and display mappers.

The backend is authoritative for business rules. Frontend validation should make
forms pleasant, but the backend must enforce correctness.

## Integration Flow

Use this sequence for backend-to-frontend integration:

```text
1. Confirm the frontend module path and user workflow.
2. Confirm the backend domain and data ownership.
3. Define or review the request DTO and response shape.
4. Implement backend controller, service, mapper, Prisma include/select, and tests.
5. Wire required seed/provision/bootstrap data when the endpoint depends on it.
6. Add or update frontend types and services using the shared ApiClient.
7. Update frontend hooks to use React Query with tenant-scoped query keys.
8. Remove mock data once real API data is wired.
9. Verify backend checks, frontend lint/build, and the target workflow.
```

## Backend Module Shape

Backend source should stay under the owning domain:

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

Use each layer intentionally:

- `controller`: route paths, HTTP methods, guards, decorators, DTO pipes, and
  service calls.
- `service`: business rules, permissions, Prisma coordination, transactions,
  provider orchestration, and domain operations.
- `dto`: request validation with `class-validator`.
- `mappers`: stable API response shapes from Prisma/provider/domain objects.
- `types`: Prisma payloads, service input/output types, and narrow type helpers.
- `utils`: pure module-specific helpers.
- `services`: provider clients, mail/storage helpers, calculation services, or
  complex sub-domain operations.

Use `src/common` only for code shared by multiple backend modules.

## Controller Rules

Controllers should stay thin:

```text
HTTP request -> guard/decorator/DTO -> service method -> mapped response
```

Controllers should not:

- Run Prisma queries.
- Call external providers directly.
- Build complex response objects.
- Contain tenant, billing, permission, or accounting rules.

If the response shape needs logic, create or extend a mapper.

## Service Rules

Services own the backend behavior.

Services should:

- Validate domain assumptions beyond DTO shape.
- Enforce tenant, branch, role, and module permissions.
- Use Prisma includes/selects from module `utils` or `types` when reused.
- Return mapper-ready objects or mapped responses according to the module's
  existing pattern.
- Keep transactions short.

Avoid external API calls inside Prisma interactive transactions. When a flow
needs both database writes and provider calls:

```text
1. Validate request and permissions.
2. Create local pending records in a short transaction.
3. Commit.
4. Call the provider outside the transaction.
5. Update local records in another short transaction.
6. Mark local state as FAILED or PENDING if the provider fails.
```

## API Contract Rules

Request contracts:

- Use DTO classes in `dto/`.
- Use `class-validator` decorators.
- Keep database logic out of DTOs.
- Do not use DTOs as response types unless the module already follows that
  pattern.

Response contracts:

- Use mappers for API responses.
- Normalize dates, nulls, enums, counts, nested relations, and provider fields.
- Avoid returning raw Prisma records directly to the frontend.
- Keep response property names stable and frontend-friendly.

Pagination and filters should be explicit in DTOs or query parsing helpers.
Sort fields should be whitelisted by the backend.

## Tenant And Branch Scope

Any company-owned data must be scoped by backend data, not by frontend trust.

Backend endpoints should derive or validate:

- `companyId`
- `branchId` or `unitId`
- user membership
- role/module permissions
- record ownership or visibility

Frontend query keys must include tenant scope when data depends on it:

```ts
["feature-records", companyId, branchId, filters, pagination, sort]
```

Never use a broad frontend query key such as `["records"]` for tenant-owned
module data.

## Frontend Integration Points

Frontend source uses this modular split:

```text
app/src/ui/modules/<domain>/<feature>/
app/src/hooks/modules/<domain>/<feature>/
app/src/services/modules/<domain>/<feature>/
app/src/types/modules/<domain>/<feature>/
app/src/constants/modules/<domain>/<feature>/
app/src/data/modules/<domain>/<feature>/
app/src/validations/modules/<domain>/<feature>/
```

Route files stay thin and render UI from `app/src/ui/...`.

Frontend API calls belong in:

```text
app/src/services/modules/<domain>/<feature>/
```

Use the shared API client:

```text
app/src/services/shared/api/ApiClient.ts
```

Do not manually repeat bearer-token handling or base URL logic. The backend base
URL comes from:

```text
NEXT_PUBLIC_API_BASE_URL
```

usually:

```text
http://localhost:3000/api/v1
```

## Frontend Service Pattern

When wiring an endpoint, prefer this shape:

```text
app/src/services/modules/<domain>/<feature>/
  FeatureService.ts
  FeatureQueryKeys.ts
```

Service functions should:

- Be named by intent, such as `listUnits`, `getUnit`, `createUnit`, or
  `updateUnitStatus`.
- Accept typed parameters.
- Return typed API responses.
- Use `ApiClient`.
- Avoid React state.

Query key factories should include tenant scope, filters, pagination, and sort
when relevant.

## Hooks And UI Wiring

Frontend hooks should own:

- React Query calls.
- Table state.
- Form state.
- Submit handlers.
- API-to-UI orchestration.
- Calls to validation helpers and data mappers.

UI components should:

- Render forms, tables, dialogs, and panels.
- Use shared module UI such as `ModuleHeader`, `ModuleStatisticCards`, and
  `ModuleTable`.
- Avoid direct `fetch` or API calls unless that is already the established
  pattern for the module.

For module tables:

- Keep table columns, option lists, storage keys, and route hrefs in constants.
- Build TanStack table instances in hooks.
- Keep row cells in `FeatureTableRow.tsx` when the module is split.
- Use shared table chrome from `app/src/ui/shared/module/module-table/`.

## Mock Data Removal

Mock data is allowed only while a module is intentionally not wired.

When backend integration is complete:

- Replace mock reads with service calls.
- Keep static select options only if they are truly frontend constants.
- Remove obsolete mock records and demo-only local storage flows.
- Keep pure mappers/default values in `data` only when they still serve real
  form or UI behavior.

Do not let a wired module silently fall back to stale mock data.

## Migrations, Seeds, And Bootstrap

If backend integration requires schema changes, read:

```text
docs/PRISMA_WORKFLOW.md
```

Migration rules:

- Never edit an applied migration unless the database has been reset or the
  team agrees.
- Every migration folder must contain `migration.sql`.
- Commit migration folders with schema changes.

If the feature requires runtime metadata or defaults, classify it correctly.

Platform metadata belongs in provisioning:

- platform modules
- permissions
- module systems
- sidebar templates
- subscription plans
- reference/catalog data required before runtime access can work

Wire platform metadata through:

```text
prisma/provisioning/provisioning.runner.ts
```

Company-owned defaults belong in company bootstrap:

- company COA rows
- default account mappings
- terms
- payment types
- discounts
- bank defaults
- transaction number setup rows
- form signatory setup rows
- tenant/module setup rows

Wire company defaults through:

```text
prisma/company-bootstrap/company-bootstrap.registry.ts
```

Do not leave required deployment data in a manual-only script.

## Loading And Cache Boundaries

Frontend has two loading levels:

- App shell/context loading for auth, active company, active branch, permissions,
  navigation, and company/branch switches.
- Module-level loading for rows, cards, summaries, forms, and details.

Do not make the global shell wait for every module query. Do not fetch dashboard
or module data from global layout hooks unless the user is on that module.

When switching company or branch:

- Cancel or invalidate old tenant-scoped queries.
- Avoid reusing old company/branch data in module views.
- Let the target module refetch after shell context is ready.

## Error Handling

Backend should return consistent, intentional errors:

- Use Nest exceptions with appropriate status codes.
- Avoid leaking provider or Prisma internals to the frontend.
- Return validation errors that the frontend can map to fields when practical.
- Log enough backend context to debug failures without exposing secrets.

Frontend services should normalize API errors through the shared API layer and
hooks should surface user-friendly messages.

## Verification

Run checks near the end of the work, not after every small edit.

Backend checks, depending on the change:

```bash
npm run typecheck
npm test -- --runInBand
node --test scripts/env/database-guard.test.cjs
node --test scripts/env/package-scripts.test.cjs
```

Frontend checks:

```bash
npm run lint
npm run build
```

For route refactors:

```bash
rg '/add/new|add/\[recordId\]|add\\\[recordId\\\]' 'app/(modules)' app/src -g '*.tsx' -g '*.ts'
```

## Integration Checklist

Before handing off backend integration work:

- Did you search for an existing endpoint, service, mapper, DTO, and frontend
  service?
- Did you place backend business rules in backend services?
- Did controllers stay thin?
- Did DTOs validate request input?
- Did mappers shape API responses?
- Did Prisma include/select objects avoid repeated inline copies?
- Did tenant and branch checks happen on the backend?
- Did permission checks use the established access-control boundary?
- Did frontend services use the shared `ApiClient`?
- Did React Query keys include company and branch scope when needed?
- Did hooks own orchestration instead of UI components?
- Did you remove or clearly retire mock data after wiring the API?
- Did seed/provision/bootstrap changes run through the proper deployment flow?
- Did you run the relevant backend and frontend checks?

## Final Rule

Integrate once, in the right layer. The backend owns truth and rules; the
frontend owns presentation and interaction. Keep the contract stable, scoped,
typed, and discoverable.
