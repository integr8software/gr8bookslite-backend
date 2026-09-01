# Neo AI Module and Tool Architecture

## Status

- Status: Proposed architecture
- Scope: Module awareness, registered AI tools, future database search, and controlled transactions
- Product: Gr8Books Neo

This document defines a simple architecture that can grow with Neo AI without creating unnecessary files or abstractions before they are needed.

## Current Situation

Neo AI currently supports chat, navigation, voice transcription, Purchase Request draft preparation, and Terms Maintenance commands.

The backend module catalog contains 82 entries, while the assistant currently knows only a small hard-coded subset. The central assistant service also contains prompting, response parsing, fallback behavior, permissions, module descriptions, and transcription coordination.

Relevant files:

```text
Backend assistant:
src/modules/ai-assistant/

Backend module catalog:
prisma/seeds/moduleCatalog.ts

Backend access control:
src/common/access/access-control.service.ts

Frontend module routes:
gr8bookslite-frontend/app/src/data/shared/modules/ModuleCatalogData.ts
```

## Goals

1. Let Neo AI recognize every active module.
2. Keep the central assistant service small.
3. Give incomplete modules safe `explain` and `open` behavior.
4. Add specialized capabilities only when a real workflow exists.
5. Reuse existing domain services for database operations.
6. Enforce permissions before every tool operation.
7. Provide a clear path toward safe searching and transaction execution.

## Non-Goals

The initial refactor will not create:

- One handler file for every module
- A generic autonomous database agent
- Raw SQL or unrestricted Prisma access
- Empty transaction implementations for unfinished modules
- A large framework of planners, policies, locks, and audit services before they are required

## Main Design

Use two simple concepts:

1. **Module profiles** describe what Neo knows.
2. **Tools** perform registered operations.

```text
User message
    |
    v
AI assistant service
    |
    +--> Module profile lookup
    |
    +--> Registered tool request
             |
             v
       Validate and authorize
             |
             v
       Existing domain service
```

The AI model may request a registered tool. It does not decide whether the user is authorized and must never query or update the database directly.

## Recommended Backend Structure

```text
src/modules/ai-assistant/
  ai-assistant.controller.ts
  ai-assistant.module.ts
  ai-assistant.service.ts
  ai-assistant.types.ts

  catalog/
    ai-module-profile.types.ts
    ai-module-profile.registry.ts
    ai-module-profile.registry.spec.ts

    profiles/
      financial-maintenance.profiles.ts
      item-management.profiles.ts
      warehouse-management.profiles.ts
      delivery-vehicle-management.profiles.ts
      cash-receipt.profiles.ts
      cash-disbursement.profiles.ts
      accounts-payable.profiles.ts
      general-journal.profiles.ts
      sales.profiles.ts
      inventory.profiles.ts
      purchasing.profiles.ts
      system-administration.profiles.ts
      other.profiles.ts

  tools/
    ai-tool.interface.ts
    ai-tool.registry.ts
    ai-tool-executor.service.ts
    ai-tool-authorizer.service.ts

  dto/
    ai-assistant-chat.dto.ts

  types/
    uploaded-ai-assistant-audio-file.type.ts
```

This is the target structure for the current refactor. Do not create additional directories until an implementation needs them.

Purchase Request and Terms Maintenance keep their existing specialized behavior during the first phase. Their dedicated tool files should be introduced only when that behavior is migrated in Phase 2.

## Module Profiles

There should be one profile entry per module, but not one file per module. Profiles are grouped by business area so teams can work independently without producing dozens of tiny files.

```ts
export type AiModuleProfile = {
  moduleCode: string;
  aliases: readonly string[];
  knowledgeLevel: 'overview' | 'detailed';
  tools: readonly string[];
};
```

Example:

```ts
export const PurchasingProfiles = [
  {
    moduleCode: 'PR',
    aliases: ['purchase request', 'PR', 'purchasing request'],
    knowledgeLevel: 'detailed',
    tools: ['module.open', 'module.explain', 'purchase-request.prepare'],
  },
  {
    moduleCode: 'CF',
    aliases: ['canvass', 'canvass form', 'quotation comparison'],
    knowledgeLevel: 'overview',
    tools: ['module.open', 'module.explain'],
  },
] as const satisfies readonly AiModuleProfile[];
```

An overview profile explains only the known general purpose. It must not invent fields, accounting rules, or transaction behavior.

## Module Descriptions

General descriptions belong in the authoritative backend module catalog because they may be useful outside Neo AI.

```ts
{
  code: 'APV',
  name: 'Accounts Payable Voucher',
  description: 'Creates and tracks obligations payable to suppliers.',
  type: ['transaction', 'registry'],
}
```

Assistant profiles add only AI-specific aliases, knowledge level, and tool names. The existing Prisma `Module.description` column can store the general description, so a new column is unnecessary.

## Tool Contract

Every executable capability uses one small contract:

```ts
export interface AiTool<TInput = unknown, TResult = unknown> {
  readonly name: string;
  readonly moduleCode: string;
  readonly permissionAction: PermissionAction;
  readonly requiresConfirmation: boolean;

  parseInput(input: unknown): TInput;
  execute(context: AiToolContext, input: TInput): Promise<TResult>;
}
```

Use specific tool names:

```text
module.open
module.explain
purchase-request.prepare
purchase-request.search
purchase-request.create
terms.search
terms.prepare
terms.update
```

Avoid vague names such as `run`, `process`, `save`, or `database-query`.

## Generic and Specialized Tools

All accessible modules use two shared tools:

```text
module.open
module.explain
```

Only modules with implemented workflows receive specialized tools. Initially, Purchase Request and Terms Maintenance retain their existing specialized behavior through registered tools.

When another module gains a real capability, add a tool for that capability. Do not add placeholder tools for future ideas.

## Registry, Executor, and Authorization

The registry maps approved tool names to implementations. Registration should be explicit so it is easy to review and test.

The executor performs one common pipeline:

```text
Find tool
  -> Parse input
  -> Check module access
  -> Check required permission
  -> Check company and branch context
  -> Run tool
```

The authorizer uses the existing `AccessControlService`. It verifies that the module is enabled, the user has access, the required action is permitted, and required company or branch context is valid.

Identity, company, branch, role, and permissions come from the authenticated backend context. Values supplied by the language model are never trusted.

Unknown tools, duplicate tool names, and unknown module codes must be rejected without executing an action.

## Frontend Action Structure

The frontend requires only a small generic dispatcher and the current specialized integrations.

```text
gr8bookslite-frontend/app/src/
  services/shared/ai-assistant/
    AiAssistantApi.ts
    AiAssistantActionDispatcher.ts

    actions/
      ModuleNavigationAction.ts
      PurchaseRequestAction.ts
      TermsMaintenanceAction.ts
```

The backend returns a module code instead of a frontend route:

```json
{
  "type": "module_command",
  "moduleCode": "APV",
  "command": "open"
}
```

The frontend resolves `APV` using `ModuleCatalogData.ts`. Backend profiles must not duplicate frontend routes.

## Future Database Search

Database search should be added as normal typed tools, not as a separate query framework.

```json
{
  "tool": "purchase-request.search",
  "input": {
    "status": "Pending",
    "dateFrom": "2026-08-01",
    "limit": 20
  }
}
```

The tool calls the module's existing query service and controls:

- Allowed filters
- Company and branch scope
- Required view permission
- Selected response fields
- Pagination and maximum results

Do not allow raw SQL, arbitrary Prisma filters, unbounded results, or cross-company searches. Add a shared search abstraction only after multiple real tools demonstrate the same reusable need.

## Future Transactions

Transaction tools must call existing domain services and follow:

```text
Prepare -> Preview -> Confirm -> Revalidate -> Execute
```

For the first real write tool, add one pending-action service rather than an entire transaction framework:

```text
tools/
  ai-pending-action.service.ts
```

The pending action retains the authenticated user, company, branch, tool name, validated input, expiration, confirmation status, and idempotency key. At confirmation, permissions and validation are checked again before the domain service runs.

Approving, posting, paying, cancelling, reversing, or deleting should continue to require explicit confirmation and existing workflow approval.

Split confirmation, idempotency, auditing, and execution into separate services only when their real implementations become large enough to justify it.

## Team Ownership

| Area | Typical owner |
|---|---|
| Purchasing profiles and tools | Purchasing team |
| Inventory profiles and tools | Inventory team |
| Sales profiles and tools | Sales team |
| Accounting profiles and tools | Accounting team |
| Registry, executor, and authorizer | Platform team |
| Frontend action dispatcher | Frontend platform team |

Teams add capabilities inside their domain without modifying the central assistant service.

## Adding a Module

1. Add or update the backend module catalog entry.
2. Add a conservative description.
3. Add one profile entry to the appropriate domain file.
4. Add specific, non-conflicting aliases.
5. Default to `overview` knowledge.
6. Enable only `module.open` and `module.explain`.
7. Confirm the frontend route map includes the module code.
8. Run catalog parity and alias tests.

## Adding a Search Tool

1. Reuse the module's existing query service.
2. Define a narrow validated input.
3. Enforce view permission and tenant context.
4. Limit fields and result count.
5. Register the tool explicitly.
6. Add the tool to the module profile.
7. Test authorized, unauthorized, and cross-tenant cases.

## Adding a Transaction Tool

1. Reuse the existing domain command service.
2. Validate the input.
3. Produce a deterministic preview.
4. Require explicit confirmation.
5. Recheck permission and validation before execution.
6. Add idempotency protection.
7. Use the application's existing audit facilities.
8. Test duplicate confirmation, expiration, permission changes, and stale data.

## Required Tests

Keep the initial suite focused:

- Every active backend module has exactly one profile.
- No profile references an unknown module code.
- Normalized aliases do not conflict.
- Unknown tools and module codes are rejected.
- Tools require the correct module and action permission.
- The model cannot replace authenticated company or branch context.
- Write tools require confirmation.
- Existing Purchase Request and Terms Maintenance behavior remains covered.

Add search and transaction tests when those tools are implemented, not before.

## Rollout

### Phase 1: Module awareness

- Add profiles for all active modules.
- Add generic explain and open tools.
- Return module codes instead of backend-owned frontend routes.
- Add catalog parity and alias tests.

### Phase 2: Existing specialized behavior

- Move Purchase Request preparation into a registered tool.
- Move Terms Maintenance commands into registered tools.
- Centralize validation and authorization.

### Phase 3: Read-only search

- Add typed search tools only for modules with implemented query services and defined requirements.

### Phase 4: Confirmed transactions

- Add one pending-action flow.
- Execute through existing domain services after confirmation and revalidation.

### Phase 5: Limited automation

- Consider automatic execution only for explicitly approved low-risk tools with clear company, role, branch, and amount limits.

## When to Split Further

Create another service or folder only when at least one condition is true:

- A file has more than one clear responsibility.
- The behavior needs independent lifecycle management.
- Two or more domains reuse the same implementation.
- Provider-specific concerns are leaking into domain tools.
- Transaction confirmation or auditing becomes too large for the executor.

Do not split code merely to match a theoretical future architecture.

## Definition of Done for the Initial Refactor

- All active modules have profiles.
- Every permitted module can be safely explained and opened.
- The central service no longer contains a hard-coded module guide.
- Frontend routes remain frontend-owned.
- Existing Purchase Request and Terms Maintenance behavior remains functional.
- Tool input and permissions are checked centrally.
- Hallucinated tools, modules, and routes cannot execute.
- Focused backend and frontend tests pass.

## Final Rule

Start with profiles, one registry, one executor, and one authorizer. Add specialized tools only for real capabilities. Add transaction infrastructure only when the first real transaction tool requires it.
