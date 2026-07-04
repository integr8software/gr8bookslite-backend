# Chart of Accounts Backend Progress

Date: 2026-06-16

## Current Status

Status: Planning and backend implementation design.

The frontend Chart of Accounts module already exists under:

- `gr8bookslite-frontend/app/src/ui/modules/maintenance/financial-management/charts-of-accounts/`
- `gr8bookslite-frontend/app/src/hooks/modules/maintenance/financial-management/charts-of-accounts/`
- `gr8bookslite-frontend/app/src/data/modules/maintenance/financial-management/charts-of-accounts/`
- `gr8bookslite-frontend/app/src/constants/modules/maintenance/financial-management/charts-of-accounts/`
- `gr8bookslite-frontend/app/src/types/modules/maintenance/financial-management/charts-of-accounts/`

The backend does not yet have a Chart of Accounts module or Prisma model. The implementation should be added before wiring the frontend away from mock/local data.

## Source Prompt

Reference prompt:

- `gr8bookslite-backend/docs/agents/COA/chart-of-accounts-codex-prompt.md`

Core required function:

```ts
generateNextAccountCode(parentAccountCode, accountGroupToCreate)
```

Required API:

```http
GET /api/chartofaccounts/next-code?parentCode=XXXX&level=Specific
```

Proposed Nest route, following the existing backend route style:

```http
GET /api/v1/maintenance/chart-of-accounts/next-code?parentCode=1010300000&level=Specific
```

## Important Repository Finding

The original prompt says the backend uses SQL Server and refers to table `tblCOA`.

This repository currently uses Prisma with PostgreSQL:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Implementation should therefore use Prisma/PostgreSQL unless the project owner confirms a separate SQL Server tenant database for accounting data.

## Account Code Format

Account codes are fixed 10-character numeric strings:

```text
A BB CC DD EEE
```

Segments:

- `A`: major account type, 1 digit
- `BB`: sub account 1, 2 digits
- `CC`: sub account 2, 2 digits
- `DD`: sub account 3, 2 digits
- `EEE`: specific account, 3 digits

Example:

```text
1010300000
```

Parsed as:

- Major: `1`
- Sub1: `01`
- Sub2: `03`
- Sub3: `00`
- Specific: `000`

## Required Business Rules

Users can create accounts at any level:

- Major
- Sub1 under Major
- Sub2 under Sub1
- Sub3 under Sub2
- Specific under Major, Sub1, Sub2, or Sub3

The backend must:

- Query persisted accounts for existing siblings.
- Return the next available code.
- Fill gaps.
- Prevent duplicates.
- Work for any valid parent level.
- Keep the frontend as a consumer of the backend rule, not an owner of the numbering rule.

## Proposed Backend Module Location

Follow the architecture modularity guide and place backend code in the maintenance domain:

```text
gr8bookslite-backend/src/modules/maintenance/chart-of-accounts/
  chart-of-accounts.module.ts
  chart-of-accounts.controller.ts
  chart-of-accounts.service.ts
  dto/
    create-chart-account.dto.ts
    get-next-chart-account-code-query.dto.ts
    update-chart-account.dto.ts
    chart-account-response.dto.ts
  mappers/
    chart-account.mapper.ts
  types/
    chart-account-level.type.ts
  utils/
    chart-account-code.util.ts
```

Register the module in:

```text
gr8bookslite-backend/src/app.module.ts
```

## Proposed Prisma Model

Recommended model name: `ChartAccount`.

Recommended table name: `chart_accounts`.

Draft schema:

```prisma
model ChartAccount {
  id                Int            @id @default(autoincrement())
  companyId         Int            @map("company_id")
  parentAccountId   Int?           @map("parent_account_id")
  parentAccountCode String?        @map("parent_account_code")
  accountCode       String         @map("account_code")
  accountTitle      String         @map("account_title")
  accountGroup      ChartAccountGroup @map("account_group")
  accountType       String?        @map("account_type")
  normalBalance     String?        @map("normal_balance")
  statementGroup    String?        @map("statement_group")
  category          String?
  status            ChartAccountStatus @default(ACTIVE)
  isSystem          Boolean        @default(false) @map("is_system")
  createdAt         DateTime       @default(now()) @map("created_at")
  updatedAt         DateTime       @updatedAt @map("updated_at")

  company           Company        @relation(fields: [companyId], references: [id], onDelete: Cascade)
  parentAccount     ChartAccount?  @relation("ChartAccountHierarchy", fields: [parentAccountId], references: [id], onDelete: SetNull)
  childAccounts     ChartAccount[] @relation("ChartAccountHierarchy")

  @@unique([companyId, accountCode])
  @@index([companyId])
  @@index([companyId, parentAccountCode])
  @@index([parentAccountId])
  @@map("chart_accounts")
}

enum ChartAccountGroup {
  MAJOR
  SUB1
  SUB2
  SUB3
  SPECIFIC
}

enum ChartAccountStatus {
  ACTIVE
  INACTIVE
}
```

Decision needed:

- Store `parentAccountCode` only for easier sibling queries, or rely only on `parentAccountId`.
- If storing both, service must keep them consistent.

## Code Generation Algorithm

Create pure utilities in:

```text
src/modules/maintenance/chart-of-accounts/utils/chart-account-code.util.ts
```

Recommended functions:

```ts
type ChartAccountGroup = 'Major' | 'Sub1' | 'Sub2' | 'Sub3' | 'Specific';

parseChartAccountCode(code: string): ParsedChartAccountCode
buildChartAccountCode(parts: ParsedChartAccountCode): string
getSiblingCodePrefix(parentCode: string | null, groupToCreate: ChartAccountGroup): string
getSiblingSegmentRange(groupToCreate: ChartAccountGroup): { start: number; end: number; max: number }
findFirstAvailablePositiveNumber(existingNumbers: number[], max: number): number
generateNextAccountCodeFromSiblings(parentCode, groupToCreate, siblingCodes): string
```

The service method should:

1. Validate `parentCode` and `level`.
2. Resolve the parent account when `parentCode` is provided.
3. Ensure the requested child level is valid for the parent level.
4. Query existing sibling accounts for the active company.
5. Extract the relevant segment.
6. Find the first missing number starting from 1.
7. Build and return the next 10-digit account code.

## Segment Rules

Sub1 under Major:

```text
1010000000 -> 1020000000 -> 1030000000
```

Increment `BB`, reset `CC DD EEE`.

Sub2 under Sub1:

```text
1010100000 -> 1010200000 -> 1010300000
```

Increment `CC`, reset `DD EEE`.

Sub3 under Sub2:

```text
1010101000 -> 1010102000 -> 1010103000
```

Increment `DD`, reset `EEE`.

Specific under any valid parent:

```text
1010300000
1010300001
1010300002
1010300003
```

Increment `EEE`, preserve the selected parent prefix.

## Proposed API Endpoints

Minimum endpoint from the prompt:

```http
GET /api/v1/maintenance/chart-of-accounts/next-code?parentCode=1010300000&level=Specific
```

Response:

```json
{
  "accountCode": "1010300003"
}
```

Likely additional endpoints needed for frontend wiring:

```http
GET /api/v1/maintenance/chart-of-accounts
GET /api/v1/maintenance/chart-of-accounts/:id
POST /api/v1/maintenance/chart-of-accounts
PATCH /api/v1/maintenance/chart-of-accounts/:id
DELETE /api/v1/maintenance/chart-of-accounts/:id
```

Deletion should probably be soft delete or status update if accounts may be used by transactions later.

## Access Control Plan

Follow nearby maintenance modules:

- Use `JwtAuthGuard`.
- Resolve `companyId` from `CurrentUser`.
- Reject requests without active company context.
- Allow read access for active company members.
- Require company admin access for create, update, delete, and code generation if it is only used during account creation.

Open decision:

- Should `next-code` require admin/create permission, or is active member access enough because it does not mutate data?

## Duplicate Prevention

Use both application validation and database protection:

- `@@unique([companyId, accountCode])`
- Service-level duplicate check before create.
- Create inside a transaction.
- If Prisma unique constraint fails, return a friendly conflict response.

Concurrency note:

- `next-code` can return the same value to two users if both request before either creates.
- Final duplicate prevention must happen in `POST`.
- For stronger guarantees, generate and create inside the same transaction during `POST`.

Recommended behavior:

- Keep `GET /next-code` for frontend preview.
- Recompute the account code in `POST` when `accountCode` is omitted or marked as auto-generated.
- Reject manually supplied duplicate codes.

## Test Plan

Add focused unit tests for the pure code utility:

- Parses valid 10-digit codes.
- Rejects malformed codes.
- Generates Sub1 codes and fills gaps.
- Generates Sub2 codes and fills gaps.
- Generates Sub3 codes and fills gaps.
- Generates Specific codes under Major, Sub1, Sub2, and Sub3.
- Throws when a segment exceeds its max.
- Throws when a requested child level is invalid for the parent.

Add service tests for:

- Company scoping.
- Parent resolution.
- Duplicate prevention.
- `next-code` response.
- Create transaction behavior.

## Suggested Implementation Order

1. Add Prisma model and migration.
2. Generate Prisma client.
3. Add code parsing/generation utility with tests.
4. Add DTOs and response mapper.
5. Add `ChartOfAccountsService`.
6. Add `ChartOfAccountsController`.
7. Register `ChartOfAccountsModule` in `AppModule`.
8. Run backend tests and typecheck.
9. Wire frontend service/hooks after backend contract is stable.

## Open Questions for Review

1. Should COA records be company-wide only, or branch-specific?
2. Should the project keep the prompt's `tblCOA` naming, or follow Prisma/PostgreSQL naming as `chart_accounts`?
3. Should `parentAccountCode` be stored, or should hierarchy depend only on `parentAccountId`?
4. Should account code generation support manual override?
5. Should `Major` account creation be included in this first backend pass? The prompt examples focus mostly on child/specific generation.
6. What are the allowed major account type digits? For example, `1` assets, `2` liabilities, `3` equity, `4` income, `5` expenses.
7. Should deleted/inactive accounts reserve their old codes forever?
8. Should account code generation be company-scoped, branch-scoped, or global?

## Progress Checklist

- [x] Read source COA prompt.
- [x] Read architecture modularity guide.
- [x] Confirm frontend COA module exists.
- [x] Confirm backend COA module does not exist yet.
- [x] Identify current database stack as Prisma/PostgreSQL.
- [x] Draft backend module placement.
- [x] Draft Prisma model.
- [x] Draft account code generation algorithm.
- [x] Draft API contract.
- [x] Draft test plan.
- [ ] Confirm open questions with project owner.
- [ ] Implement Prisma migration.
- [ ] Implement backend module.
- [ ] Add backend tests.
- [ ] Wire frontend to backend API.

