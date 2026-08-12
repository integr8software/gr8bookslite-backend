# Gr8BooksNeo Backend Testers

## Purpose

This document defines the minimum Swagger and Jest standard for every Gr8BooksNeo backend module.

Every new or modified backend module must follow these standards unless there is a documented technical reason not to. The goals are:

- consistent API documentation
- consistent automated testing
- easier maintenance
- better frontend integration
- safer refactoring
- stronger CI/CD reliability

## Current Backend Tooling

The backend is a NestJS application using Swagger through `@nestjs/swagger`, DTO validation through `class-validator`, and tests through Jest.

Important files:

- `src/openapi.ts` configures Swagger/OpenAPI.
- `src/app.setup.ts` enables the global API prefix, URI versioning, validation pipe, CORS, and exception filter.
- `package.json` stores the Jest config and backend quality scripts.
- Unit specs live beside the source under `src/**/*.spec.ts`.
- E2E specs live under `test/**/*.e2e-spec.ts`.

Useful commands:

```bash
npm test
npm run test:watch
npm run test:cov
npm run test:e2e
npm run typecheck
npm run lint:check
npm run build
npm run openapi:generate
```

Swagger UI is configured at:

```text
/api/docs
```

The OpenAPI JSON endpoint is configured at:

```text
/api/docs-json
```

## Core Principles

Swagger documents the API contract. It tells frontend and backend developers:

- what endpoints exist
- request body shape
- response body shape
- validation rules
- possible status codes
- authentication requirements
- path and query parameters

Swagger does not verify correctness.

Jest verifies behavior. It protects the application from regressions by testing:

- business rules
- calculations
- transactions
- permissions
- edge cases
- recursive logic
- service behavior
- mapper and utility behavior where logic is non-trivial

Jest does not replace Swagger.

Correct business behavior is more important than maximizing test coverage percentage. Twenty high-value tests protecting actual ERP rules are better than hundreds of brittle tests that only increase coverage.

Tests should protect behavior such as:

- financial calculations
- VAT behavior
- accounting entries
- inventory quantity movement
- duplicate prevention
- permission boundaries
- company/branch isolation
- state transitions
- transaction rollback
- hierarchy propagation
- currency behavior

## Required Layer Standards

| Layer | Swagger | Jest |
| --- | --- | --- |
| Controller | Required | Conditional/minimal |
| DTO | Required | Usually unnecessary |
| Service | No | Required for business rules |
| Mapper | No | Required if complex |
| Utils | No | Required if non-trivial |
| Guards | No | Required if enforcing application rules |
| Pipes | No | Required if enforcing application rules |
| Interceptors | No | Required if enforcing application rules |
| Prisma repository/query access | No | Mock during service tests |

Required means the rule should be applied whenever the layer exists and the behavior is meaningful. Recommended or conditional means the test or documentation is useful only when it protects behavior that can realistically break.

Required:

- Swagger for public controller endpoints
- Swagger metadata for request and response DTOs
- `class-validator` validation for input DTOs
- Jest coverage for meaningful service business rules
- Jest tests for custom guards, pipes, and interceptors that enforce application rules
- Jest tests for non-trivial shared utilities

Recommended or conditional:

- controller unit tests
- mapper tests
- integration/e2e tests
- additional simple lookup or maintenance CRUD edge coverage beyond core rules

Do not create tests merely to satisfy a checklist. Prefer meaningful behavioral tests over artificial coverage.

## Architecture Reminder

Preferred backend flow:

```text
Controller
  -> Service
  -> Shared domain/helper logic when genuinely reusable
  -> Prisma
```

Controller owns HTTP concerns. Service owns module business rules. Shared utilities and shared services own behavior that is genuinely reusable across modules. Prisma handles persistence.

Avoid business logic inside controllers. Avoid hiding business rules inside Prisma query helpers merely to reduce service size. Do not introduce a repository layer unless the existing project already requires one for that module.

## Reuse Existing Patterns

Before implementing or modifying a module, inspect similar existing modules first.

Reuse existing project conventions where they fit:

- controller structure
- DTO naming and Swagger metadata style
- service and Prisma transaction patterns
- validation helpers
- lookup services
- shared utilities
- shared accounting-entry logic or templates when applicable
- company and branch access checks
- permission patterns
- response DTO conventions
- error and exception patterns

Do not duplicate logic if a reusable implementation already exists. Do not force reuse when the existing implementation is tightly coupled to another module.

## Avoid Over Engineering

Follow existing project patterns before creating new abstractions.

Do not introduce repositories, managers, factories, helper layers, services, wrappers, or utility files unless they solve a real reuse or separation concern. Do not split simple logic across many files unnecessarily. Do not create abstractions for code used only once unless there is a strong architectural reason.

Prefer simple, readable NestJS service logic over excessive indirection. Use the existing architecture instead of inventing a new pattern per module.

Do not add libraries or testing frameworks when the existing stack already solves the problem. For example, do not introduce Vitest, Mocha, Cypress, Pact, or another testing stack when Jest and the existing e2e tooling cover the requirement.

## Controller Standard

Every public endpoint must include Swagger decorators.

Minimum required decorators:

- `@ApiTags()`
- `@ApiBearerAuth()` when the endpoint requires JWT authentication
- `@ApiOperation()`
- `@ApiOkResponse()`, `@ApiCreatedResponse()`, or `@ApiResponse()`
- `@ApiBody()` when the request body is not obvious from `@Body()`
- `@ApiParam()` when path parameters exist
- `@ApiQuery()` when query parameters exist and are not fully represented by a query DTO

Example:

```ts
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiTags('Unit of Measurement')
@Controller({
  path: 'maintenance/unit-of-measurement',
  version: '1',
})
export class UnitOfMeasurementController {}
```

```ts
@Post()
@ApiOperation({ summary: 'Create unit of measurement' })
@ApiCreatedResponse({
  description: 'Unit of measurement created.',
  type: SaveUnitOfMeasurementResponseDto,
})
create(@CurrentUser() user: AuthUser, @Body() dto: CreateUnitOfMeasurementDto) {
  return this.unitOfMeasurementService.create(user, dto);
}
```

Controllers should contain little or no business logic. Controllers should primarily:

- receive route parameters, query parameters, and request body values
- delegate to services
- return the service response

Do not place duplicate validation, permission checks, accounting logic, calculations, or workflow transitions in controllers.

## DTO Standard

DTOs must contain validation decorators and Swagger decorators.

Use:

- `class-validator` for validation
- `class-transformer` when runtime transformation is required
- `@ApiProperty()` for required fields
- `@ApiPropertyOptional()` for optional fields
- enum metadata for enum fields
- concise examples or constraints where useful

Example:

```ts
export class CreateTermDto {
  @ApiProperty({ maxLength: 150 })
  @IsString()
  @MaxLength(150)
  name!: string;

  @ApiProperty({ enum: TermDateMode })
  @IsEnum(TermDateMode)
  dateMode!: TermDateMode;

  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  period!: number;
}
```

Avoid excessively long Swagger descriptions. Document what API consumers need to send or expect.

DTOs usually do not require Jest tests. Exceptions:

- custom validation decorators
- transformation logic
- complex parsing
- DTOs that normalize, derive, or reject values outside simple decorators

## Service Standard

Every service containing business logic must have Jest tests.

Services usually contain:

- business rules
- transactions
- recursive operations
- calculations
- validations
- permission checks
- workflow transitions
- Prisma orchestration

These must be tested when they are meaningful business behavior for the module.

Meaningful service test scenarios depend on the module, but usually include:

- create
- update
- delete or deactivate
- duplicate validation
- inactive records
- permission failures
- branch/company access failures
- transaction rollback behavior
- recursive or hierarchical updates
- calculated totals
- status transitions
- expected exceptions
- edge cases

Service tests should mock Prisma and related dependencies. Test the business behavior, not Prisma internals.

Example shape:

```ts
function createService(prismaOverrides: Record<string, unknown> = {}) {
  const prisma = {
    companyUnit: {
      findUnique: jest.fn(),
    },
    unitOfMeasurement: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(prisma)),
    ...prismaOverrides,
  };

  return {
    prisma,
    service: new UnitOfMeasurementService(prisma as never),
  };
}
```

## Controller Tests

Controller tests should remain minimal.

Verify:

- the controller calls the correct service method
- parameters are passed correctly
- the service response is returned
- lookup endpoints delegate to lookup services where applicable

Do not duplicate service business-rule tests in controller specs.

Example expectations:

```ts
await expect(controller.findAll(user, query)).resolves.toBe(response);
expect(service.findAll).toHaveBeenCalledWith(user, query);
```

## Mapper Standard

Simple mappers do not require Jest tests.

Example simple mapper:

```ts
return {
  id,
  code,
  description,
};
```

Complex mappers require Jest tests.

Complex mapper examples:

- computed fields
- currency conversion
- nested mapping
- derived statuses
- permission/action normalization
- plan/price formatting
- accounting entry mapping

## Utility Standard

Utility functions should be tested when they contain logic.

Examples:

- VAT calculation
- exchange-rate computation
- document-number generation
- hierarchy traversal
- accounting computations
- date calculation
- permission normalization
- string normalization used in uniqueness checks

Tests for utilities should be direct and table-driven when practical.

## Guard, Pipe, and Interceptor Standard

Guards, pipes, and interceptors should have Jest tests when they enforce application behavior.

Test:

- allowed cases
- denied cases
- missing metadata
- malformed input
- boundary values
- thrown exceptions

Do not test NestJS framework behavior. Test the local rule implemented by the guard, pipe, or interceptor.

## Repository and Prisma Standard

Do not write unit tests for Prisma CRUD itself.

Correct unit-test boundary:

```text
Service
  -> mocked Prisma dependency
  -> verify business behavior and query intent
```

Avoid:

```text
Test Prisma create/update/delete behavior directly
```

Use integration or e2e tests only when the DB behavior itself is part of the risk being verified.

## Integration / E2E Testing

Integration and e2e tests are not required for every module.

Add them selectively for high-risk workflows where the interaction between routes, validation, authentication, persistence, transactions, or multiple services is important. Good Gr8BooksNeo candidates include:

- Authentication
- Onboarding
- Sales Invoice posting
- Service Invoice posting
- Goods Receipt
- Goods Issue
- Warehouse Transfer
- Accounting Entries
- Inventory movement
- Billing/payment workflows
- critical import workflows

Use the existing e2e structure:

```text
test/**/*.e2e-spec.ts
```

Run e2e tests with:

```bash
npm run test:e2e
```

Do not add e2e tests for simple CRUD modules unless route-level integration risk justifies it.

## Swagger Guidelines

Swagger should document:

- endpoint purpose
- request body
- response body
- enums
- examples
- query parameters
- path parameters
- important status codes
- authentication requirements

Swagger should avoid:

- implementation details
- long explanations that belong in internal docs
- duplicated business rules that can drift from service logic
- vague response descriptions without a response type when a DTO exists

Generate OpenAPI after API contract changes:

```bash
npm run openapi:generate
```

## Jest Guidelines

Write tests that protect business behavior.

Good tests cover:

- duplicate detection
- permission validation
- transaction rollback
- recursive updates
- calculations
- accounting entries
- inventory movement
- currency conversion
- approval/status workflows
- multi-company and branch access boundaries

Avoid low-value tests:

- getter/setter behavior
- DTO property assignment
- Prisma internals
- NestJS framework behavior
- tests that only duplicate implementation line by line

Prefer a small number of high-value behavioral tests over many brittle tests.

## Testing Priority

Highest priority:

- Financial Management
- Inventory
- Sales
- Purchasing
- Accounting Entries
- Authentication
- Onboarding
- Multi Currency
- Imports
- Approval workflows
- Permission and company-access logic

Medium priority:

- Maintenance modules
- Lookup modules
- Reporting filters
- User preference or sidebar logic

Low priority:

- simple DTOs
- constant files
- static configuration
- simple type-only files

## AI Agent Instructions

Whenever implementing or modifying a backend module, apply these rules.

Before coding:

- inspect the current module
- search for a similar existing module
- identify existing shared utilities and patterns
- determine which Swagger additions are actually needed
- identify meaningful business rules requiring Jest tests
- check whether integration/e2e coverage is justified
- avoid unnecessary architecture changes

Controllers:

- add Swagger decorators
- keep controllers thin
- do not place business logic in controllers
- add minimal controller tests only when route delegation has meaningful risk

DTOs:

- add Swagger decorators
- add class-validator decorators
- keep DTOs validation-focused
- test only custom validation, transformation, or parsing logic

Services:

- place business logic inside services
- create Jest tests for meaningful business rules
- mock Prisma dependencies
- test success cases
- test edge cases
- test failure cases
- test transaction behavior when transactions are used

Utilities:

- test calculations
- test helper functions with non-trivial branches
- prefer table-driven tests for multiple input/output cases

Mappers:

- skip tests for direct field projection
- test computed, nested, or derived mapping

General discipline:

- do not generate tests purely to satisfy file-count or coverage goals
- do not create duplicate tests for behavior already covered at a better layer
- do not refactor unrelated code while implementing Swagger or Jest unless necessary for correctness
- keep changes scoped to the task

## Module Completion Checklist

Before considering a backend module complete, verify:

Required:

- Swagger exists on every public endpoint.
- Authenticated controllers include `@ApiBearerAuth()`.
- DTOs are documented with Swagger decorators.
- DTO validation is complete.
- Controllers delegate business behavior to services.
- Meaningful service business rules have Jest coverage.
- `npm run typecheck` passes.
- Relevant Jest tests pass.

Conditional:

- Prisma is mocked in unit tests when service tests touch Prisma-dependent behavior.
- Controller tests exist when route delegation has meaningful risk.
- Controller tests do not duplicate service tests.
- Edge cases are tested when the module has meaningful edge cases.
- Error cases are tested when the module rejects invalid states or inputs.
- Transaction rollback is tested when transactions exist.
- Mapper tests exist when a mapper contains computed, nested, or derived logic.
- Utility tests exist when a utility contains non-trivial logic.
- Guard, pipe, or interceptor tests exist when they enforce application rules.
- E2E tests are added when workflow risk justifies route-level integration coverage.
- `npm run openapi:generate` is run when the API contract changes.

## Philosophy

Swagger explains the API.

Jest protects the business.

Controllers expose the API.

Services own the business logic.

Keep controllers thin.

Keep services testable.

Test behavior, not framework code.

Consistency across modules is more valuable than maximizing coverage on individual files.
