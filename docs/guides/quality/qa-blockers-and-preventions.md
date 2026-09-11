# Backend QA Blockers and Prevention Guide

## Overview

The Gr8BooksNeo automated PR QA workflow inspects changed files across every pull request. When specific automated rules detect missing metadata, missing validation, or absent unit test coverage, the QA tool raises **Blockers** that prevent PR approval.

This guide details the most common recurring blockers, the root causes (including scanner quirks), exact code patterns to follow, and a pre-PR checklist to ensure zero QA blockers.

---

## Quick Reference of Common QA Rules

| Rule Identifier | Category | Typical Cause | Resolution |
| :--- | :--- | :--- | :--- |
| `backend.swagger.dto.metadata` | Backend Requirements | Missing `@ApiProperty()` / `@ApiPropertyOptional()` on DTO fields, **or** multi-line decorator options misparsed by the scanner | Add Swagger decorator, and **format decorator on a single line** |
| `backend.dto.validation` | Backend Requirements | Changed input DTO fields missing `class-validator` decorators, **or** multi-line decorator options misparsed as class fields | Add `class-validator` annotations (`@IsString()`, `@IsOptional()`, etc.) and single-line decorators |
| `backend.jest.service.business-logic` | Backend Requirements | Business-critical logic changed in a service without a colocated Jest spec | Add colocated `*.service.spec.ts` testing domain rules and validation |
| `backend.jest.conditional-logic` | Backend Requirements | Helper/utility file with `if`/`switch`/branching logic changed without a colocated spec | Add colocated `*.util.spec.ts` testing branches, builders, and exceptions |

---

## 1. DTO Swagger & Validation Blockers

### Rules
- `backend.swagger.dto.metadata`
- `backend.dto.validation`

### Why This Commonly Happens (The Multi-Line Scanner Pitfall)
The QA scanner inspects PR diffs line-by-line using regular expressions to detect class property declarations (e.g. `^\s*([a-zA-Z0-9_$]+)\s*(\??):`). 

When decorator options are formatted across multiple lines:
```typescript
// ❌ PROBLEMATIC: Triggers false positives
export class UpdateStatusDto {
  @ApiProperty({
    description: 'Target status',
    enum: StatusEnum,
    example: StatusEnum.APPROVED,
  })
  @IsEnum(StatusEnum)
  status: StatusEnum;
}
```

The scanner sees:
1. `description: 'Target status',` -> Scanner thinks `description` is a class property lacking validation and Swagger decorators.
2. `enum: StatusEnum,` -> Scanner thinks `enum` is a class property.
3. `example: StatusEnum.APPROVED,` -> Scanner thinks `example` is a class property.
4. `status: StatusEnum;` -> Preceded by `})` rather than `@ApiProperty(...)`, so the scanner reports that `status` is missing `@ApiProperty()`.

Result: **3 to 4 Blocker findings for a single field!**

### The Standard Pattern: Single-Line Decorators

Always declare `@ApiProperty` and `@ApiPropertyOptional` decorators on a **single line**:

```typescript
// ✅ RECOMMENDED: Single-line decorator prevents parser confusion
export class UpdateStatusDto {
  @ApiProperty({ enum: StatusEnum, example: StatusEnum.APPROVED, description: 'Target status' })
  @IsEnum(StatusEnum)
  status: StatusEnum;
}
```

For nested DTO classes, use a function wrapper `type: () => TargetDto` on a single line:
```typescript
// ✅ RECOMMENDED
export class VoucherDefaultAccountsResponseDto {
  @ApiProperty({ type: () => AccountDto, description: 'Default cash account' })
  defaultCashAccount: AccountDto;

  @ApiPropertyOptional({ type: () => AccountDto, description: 'Settlement credit account' })
  creditAccount?: AccountDto;
}
```

### Pattern for Query DTOs with Sort/Filter Enums

When defining list query DTOs, extract array choices into a constant outside the class:

```typescript
// ✅ RECOMMENDED
export const ItemSortFields = ['name', 'code', 'status', 'createdAt'] as const;
export type ItemSortField = (typeof ItemSortFields)[number];

export class GetItemListQueryDto {
  @ApiPropertyOptional({ description: 'Search term for name or code' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ enum: ItemSortFields, description: 'Sort by field', default: 'name' })
  @IsOptional()
  @IsIn(ItemSortFields)
  sortBy?: ItemSortField;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], description: 'Sort direction', default: 'asc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDirection?: 'asc' | 'desc';
}
```

---

## 2. Business-Critical Service Jest Specs

### Rule
- `backend.jest.service.business-logic`

### Trigger Criteria
This rule triggers when a PR creates or modifies a service file that implements:
- Financial or voucher calculation and balancing (e.g. APV, CV, JV, Check Voucher)
- Accounting debit/credit equality checks
- Currency conversion or exchange rate validations
- Workflow state transitions and approval checks
- Inventory movement or balance allocations

If there is no **colocated** Jest spec file (`*.service.spec.ts`) in the exact same directory, QA blocks the PR.

### Colocation Convention
```text
src/modules/accounts-payable/accounts-payable-voucher/services/
├── accounts-payable-voucher-accounting.service.ts
└── accounts-payable-voucher-accounting.service.spec.ts  <-- Required colocated spec
```

### Writing Focused Behavioral Tests
Tests should focus on domain invariant rules and error paths rather than testing simple NestJS dependency wiring:

```typescript
describe('AccountsPayableVoucherAccountingService', () => {
  let service: AccountsPayableVoucherAccountingService;

  beforeEach(() => {
    service = new AccountsPayableVoucherAccountingService();
  });

  it('validates debit and credit equality', () => {
    expect(() =>
      service.validateSubmittedPayload({
        // unbalanced debit and credit
        journalEntries: [
          { lineNumber: 1, debit: 1000, credit: 0 },
          { lineNumber: 2, debit: 0, credit: 900 },
        ],
        voucherAmount: 1000,
        currencyCode: 'PHP',
        exchangeRate: 1,
        details: [{ lineNumber: 1, amount: 1000, totalAmountDue: 1000, currencyCode: 'PHP', exchangeRate: 1 }],
      }),
    ).toThrow(new BadRequestException('Journal entry debit and credit totals must balance.'));
  });
});
```

---

## 3. Utility & Helper Conditional Logic Jest Specs

### Rule
- `backend.jest.conditional-logic`

### Trigger Criteria
This rule triggers when a helper, mapper, or utility file (`*.util.ts`, `*.helper.ts`) contains:
- `if` / `else` conditional checks
- `switch` statements or ternary conditions
- Query filter building logic (`where` clause assembly)
- Validation rules that throw exceptions

If non-trivial conditional branches are added or changed without a **colocated** spec file (`*.util.spec.ts`), QA blocks the PR.

### Colocation Convention
```text
src/modules/maintenance/services-maintenance/utils/
├── service-maintenance-account.util.ts
├── service-maintenance-account.util.spec.ts  <-- Colocated test for account rules
├── service-maintenance-data.util.ts
└── service-maintenance-data.util.spec.ts     <-- Colocated test for data/where builders
```

### Key Areas to Cover in Util Tests
1. **Query Filter Builders (`build*Where`)**: Test default where conditions, optional filters (when present and absent), and search regex/mode properties.
2. **Sort Builders (`build*OrderBy`)**: Test default order and custom sort directions.
3. **Input Validation Functions (`validate*Input`)**: Test every `throw new BadRequestException(...)` branch as well as valid happy paths.
4. **Data Mapping Functions (`to*Data`)**: Test that fields are sanitized/trimmed and optional fields are mapped cleanly.

---

## 4. Maintenance Account Setup Contracts

When a maintenance module supports both **Select Existing Account** and **Generate Account Automatically**, keep the mode explicit across the full contract:

- Persist an account setup mode (`AUTO` / `EXISTING`) in the backend model instead of inferring mode from the presence of a Chart of Accounts foreign key.
- Request DTOs must include the mode and validate the selected account ID when `EXISTING` is used.
- Response DTOs must return the mode and linked account ID so edit/view screens do not guess from generated account arrays.
- Status changes should update linked Chart of Accounts rows only for backend-generated accounts; selected existing accounts stay independently managed.
- Add colocated service specs for missing selected account validation, existing-account saves, and automatic account generation.
- Regenerate Swagger/OpenAPI before frontend Orval, then wire the generated DTO enum/types through the frontend API adapter.

---

## 5. Pre-PR Self-Check Checklist

Before committing and opening or updating a pull request:

### DTOs
- [ ] Every class field in request DTOs has both Swagger decorators (`@ApiProperty` or `@ApiPropertyOptional`) and `class-validator` decorators.
- [ ] Every class field in response DTOs has `@ApiProperty` or `@ApiPropertyOptional`.
- [ ] **All `@ApiProperty` / `@ApiPropertyOptional` decorators are formatted on a single line**, avoiding multiline object options that confuse the QA parser.
- [ ] Nested DTO types use the arrow function syntax: `@ApiProperty({ type: () => MyDto, ... })`.

### Service Logic
- [ ] Any modified service with business calculations, voucher validations, or state checks has a colocated `*.service.spec.ts` in the same directory.
- [ ] Tests cover core business invariants (balancing, zero amounts, currency matching, status transition boundaries).

### Utility / Helper Logic
- [ ] Any modified `*.util.ts` or helper file containing `if`/`switch`/branching logic has a colocated `*.util.spec.ts`.
- [ ] The spec covers each branching condition and any thrown exceptions.

### Local Verification
```bash
# Typecheck
npm run typecheck

# Run Jest tests on changed modules
npx jest path/to/changed.service.spec.ts path/to/changed.util.spec.ts
```
