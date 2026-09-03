# New Transaction Module: Backend Integration Guide & Blueprint

## 1. Purpose & Scope

This guide is the authoritative implementation blueprint for building **Backend Integration for any New Transaction Module** in **Gr8Books Lite**.

Use this document whenever:
1. Creating a brand-new transaction module on the backend from scratch.
2. Migrating an existing mock-based frontend transaction module into a fully integrated, backend-persisted module.
3. Adding standard ERP capabilities to a module: sequential numbering, master data snapshots, approval workflows, double-entry GL journal entries, table preferences, and dynamic field management.

Primary source references:
- General Backend Integration: [BACKEND_INTEGRATION_GUIDE.md](file:///c:/Users/Bay/Integr8/gr8bookslite-backend/docs/agents/guides/BACKEND_INTEGRATION_GUIDE.md)
- Modularity & Folder Structure: [ARCHITECTURE_MODULARITY_GUIDE.md](file:///c:/Users/Bay/Integr8/gr8bookslite-backend/docs/agents/guides/ARCHITECTURE_MODULARITY_GUIDE.md)
- Accounting Entries & GL Engine: [accounting_entries.md](file:///c:/Users/Bay/Integr8/gr8bookslite-backend/docs/agents/modules/accounting_entries.md)
- Currency & Exchange Rate Standard: [currency-and-exchange-rate-standard.md](file:///c:/Users/Bay/Integr8/gr8bookslite-backend/docs/architecture/currency-and-exchange-rate-standard.md)
- Reusable Maintenance Lookup APIs: [maintenance-reusable-lookup-apis.md](file:///c:/Users/Bay/Integr8/gr8bookslite-backend/docs/modules/maintenance/maintenance-reusable-lookup-apis.md)
- Tax Default Account API: [tax-default-account-api.md](file:///c:/Users/Bay/Integr8/gr8bookslite-backend/docs/modules/tax/tax-default-account-api.md)
- Shared Frontend Lookup Services: [shared-frontend-lookup-services.md](file:///c:/Users/Bay/Integr8/gr8bookslite-frontend/docs/shared-frontend-lookup-services.md)
- Reference Live Implementation: [accounts_payable_voucher_backend_integration.md](file:///c:/Users/Bay/Integr8/gr8bookslite-backend/docs/agents/modules/accounts-payable-voucher/accounts_payable_voucher_backend_integration.md)

---

## 2. Architectural Pillars for Transaction Modules

Transaction modules in Gr8Books Lite differ fundamentally from simple master/maintenance entities. Every transaction module must fulfill seven mandatory architectural pillars:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       7 PILLARS OF TRANSACTION MODULES                      │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. Multi-Tenant Scoping   │ companyId + branchUnitId on every query         │
│ 2. Sequence Engine        │ AUTO or MANUAL series resolution per branch     │
│ 3. Master Data Snapshots  │ Immutable snapshots (Party, Account, Cost Ctr)  │
│ 4. Double-Entry GL Ledger │ Balanced Dr/Cr JournalEntryHeader/Detail (jeno) │
│ 5. Status State Machine   │ DRAFT ➔ FOR_APPROVAL ➔ APPROVED ➔ POSTED       │
│ 6. Cross-Cutting Systems  │ Approvals, Table Preferences, Field Management  │
│ 7. OpenAPI & Orval Pipeline│ NestJS DTOs ➔ openapi.json ➔ Orval React Query │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Directory & File Organization

Place all new transaction code under its business domain in `gr8bookslite-backend/src/modules/<domain>/<submodule>/`.

### 3.1 Standard Submodule Directory Tree
```text
src/modules/<domain>/<submodule>/
├── <submodule>.module.ts                  # NestJS module importing Prisma, Company, etc.
├── <submodule>.controller.ts              # REST Controller with Swagger @ApiTags & version: '1'
├── <submodule>.service.ts                 # Master business flow, validations, GL, snapshots
├── dto/
│   ├── create-<submodule>.dto.ts          # Validation schemas for creation (class-validator)
│   ├── update-<submodule>.dto.ts          # Validation schemas for updating editable fields
│   ├── get-<submodule>-list-query.dto.ts  # Paginated query filters (branch, status, dates)
│   ├── update-<submodule>-status.dto.ts   # Status transition payload (APPROVE, POST, CANCEL)
│   ├── <submodule>-details.dto.ts         # Line items & detail array validation
│   ├── journal-entry.dto.ts               # Accounting entries payload validation
│   └── <submodule>-response.dto.ts        # Strongly typed Swagger response containers
├── mappers/
│   └── <submodule>.mapper.ts              # Prisma entity -> API response DTO transformations
├── prisma/
│   └── <submodule>.include.ts             # Strongly typed Prisma relation includes
├── services/
│   ├── <submodule>-accounting.service.ts  # GL entry construction and balancing checks
│   └── <submodule>-lookup.service.ts      # Dropdown options (parties, terms, accounts)
├── types/
│   └── <submodule>-with-details.type.ts   # Prisma payload utility types
└── utils/
    └── <submodule>-totals.util.ts         # Tax, rounding, and subtotal calculation helpers
```

### 3.2 Parent Domain Module Registration
Export the submodule in its parent domain module (`src/modules/<domain>/<domain>.module.ts`) and ensure the domain module is registered in `src/app.module.ts`.

---

## 4. Step 1: Database Schema & Migration (`schema.prisma`)

### 4.1 Schema Modeling Pattern
Every transaction document requires a **Header** table and (if multi-line) a **Details** table.

```prisma
// =========================================================
// Domain: <DomainName> -> Model: <ModuleName>
// =========================================================

model CashAdvance {
  id                    BigInt              @id @default(autoincrement())
  companyId             Int                 @map("company_id")
  branchUnitId          Int?                @map("branch_unit_id")
  partyId               BigInt?             @map("party_id")
  termId                BigInt?             @map("term_id")
  creditAccountId       BigInt?             @map("credit_account_id")
  
  // Document Identification
  transNo               String              @map("trans_no") @db.VarChar(80)
  documentDate          DateTime            @map("document_date") @db.Date
  dueDate               DateTime?           @map("due_date") @db.Date
  referenceNo           String?             @map("reference_no") @db.VarChar(120)

  // Master Data Historical Snapshots (Crucial for BIR / Audit compliance)
  partyCodeSnapshot     String              @map("party_code_snapshot") @db.VarChar(80)
  partyNameSnapshot     String              @map("party_name_snapshot") @db.VarChar(255)
  addressSnapshot       String?             @map("address_snapshot") @db.VarChar(500)
  contactPersonSnapshot String?             @map("contact_person_snapshot") @db.VarChar(255)
  contactNoSnapshot     String?             @map("contact_no_snapshot") @db.VarChar(40)
  tinSnapshot           String?             @map("tin_snapshot") @db.VarChar(50)
  accountCodeSnapshot   String              @map("account_code_snapshot") @db.VarChar(80)
  accountTitleSnapshot  String?             @map("account_title_snapshot") @db.VarChar(255)
  costCenterSnapshot    String?             @map("cost_center_snapshot") @db.VarChar(255)
  costCenterCodeSnapshot String?            @map("cost_center_code_snapshot") @db.VarChar(80)
  projectRefSnapshot    String?             @map("project_ref_snapshot") @db.VarChar(255)
  projectCodeSnapshot   String?             @map("project_code_snapshot") @db.VarChar(80)

  // Financial Amounts & Currency (Adheres to currency-and-exchange-rate-standard.md)
  currencyCode          String              @default("PHP") @map("currency_code") @db.VarChar(10)
  exchangeRate          Decimal             @default(1.000000) @map("exchange_rate") @db.Decimal(18, 6)
  amount                Decimal             @db.Decimal(18, 2)
  remarks               String?             @db.VarChar(500)

  // Transaction Status Lifecycle
  status                CashAdvanceStatus   @default(DRAFT)

  // Audit Trails
  createdByUserId       Int?                @map("created_by_user_id")
  updatedByUserId       Int?                @map("updated_by_user_id")
  approvedByUserId      Int?                @map("approved_by_user_id")
  approvedAt            DateTime?           @map("approved_at")
  disapprovedByUserId   Int?                @map("disapproved_by_user_id")
  disapprovedAt         DateTime?           @map("disapproved_at")
  cancelledByUserId     Int?                @map("cancelled_by_user_id")
  cancelledAt           DateTime?           @map("cancelled_at")
  postedByUserId        Int?                @map("posted_by_user_id")
  postedAt              DateTime?           @map("posted_at")
  deletedAt             DateTime?           @map("deleted_at")
  createdAt             DateTime            @default(now()) @map("created_at")
  updatedAt             DateTime            @updatedAt @map("updated_at")

  // Relations (Cascade on company, SetNull on foreign masters)
  company               Company             @relation(fields: [companyId], references: [id], onDelete: Cascade)
  party                 Party?              @relation(fields: [partyId], references: [id], onDelete: SetNull)
  creditAccount         ChartAccount?       @relation(fields: [creditAccountId], references: [id], onDelete: SetNull)
  details               CashAdvanceDetail[]

  @@unique([companyId, transNo], map: "cash_advances_company_trans_no_key")
  @@index([companyId, status], map: "cash_advances_company_status_idx")
  @@index([companyId, documentDate], map: "cash_advances_company_document_date_idx")
  @@index([partyId], map: "cash_advances_party_id_idx")
  @@map("cash_advances")
}

model CashAdvanceDetail {
  id                    BigInt              @id @default(autoincrement())
  cashAdvanceId         BigInt              @map("cash_advance_id")
  lineNumber            Int                 @map("line_number")
  purpose               String              @db.VarChar(255)
  amount                Decimal             @db.Decimal(18, 2)
  remarks               String?             @db.VarChar(255)

  cashAdvance           CashAdvance         @relation(fields: [cashAdvanceId], references: [id], onDelete: Cascade)

  @@unique([cashAdvanceId, lineNumber], map: "cash_advance_details_advance_line_key")
  @@index([cashAdvanceId], map: "cash_advance_details_cash_advance_id_idx")
  @@map("cash_advance_details")
}

enum CashAdvanceStatus {
  DRAFT
  FOR_APPROVAL
  APPROVED
  DISAPPROVED
  POSTED
  CANCELLED
  CLOSED
}
```

### 4.2 Migration Generation
```bash
# In gr8bookslite-backend directory:
npx prisma migrate dev --name add_cash_advance_module
```

---

## 5. Step 2: DTOs & Swagger Annotations

All input DTOs must use `class-validator` and `class-transformer`. All response DTOs must use `@ApiProperty()` so the Swagger JSON fully exposes response types to Orval.

### 5.1 Create DTO Example (`create-cash-advance.dto.ts`)
```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { CreateJournalEntryDto } from './journal-entry.dto';

export class CreateCashAdvanceDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  branchUnitId?: number;

  @ApiPropertyOptional({ example: 'CA-2026-00001', description: 'Omit for auto-generation' })
  @IsOptional()
  @IsString()
  transactionNo?: string;

  @ApiProperty({ example: '2026-09-02' })
  @IsNotEmpty()
  @IsDateString()
  documentDate: string;

  @ApiPropertyOptional({ example: '2026-09-30' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ example: 'REQ-9921' })
  @IsOptional()
  @IsString()
  referenceNo?: string;

  @ApiProperty({ example: 'EMP-001' })
  @IsNotEmpty()
  @IsString()
  partyCode: string;

  @ApiPropertyOptional({ example: '1' })
  @IsOptional()
  @IsString()
  partyId?: string;

  @ApiProperty({ example: '10101' })
  @IsNotEmpty()
  @IsString()
  creditAccountCode: string;

  @ApiPropertyOptional({ example: '1' })
  @IsOptional()
  @IsString()
  creditAccountId?: string;

  @ApiProperty({ example: 'PHP', default: 'PHP' })
  @IsNotEmpty()
  @IsString()
  currency: string;

  @ApiProperty({ example: 1.0 })
  @IsNotEmpty()
  @IsNumber()
  exchangeRate: number;

  @ApiProperty({ example: 5000.0 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({ example: 'Field travel cash advance' })
  @IsOptional()
  @IsString()
  remarks?: string;

  @ApiPropertyOptional({ type: () => [CreateJournalEntryDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateJournalEntryDto)
  journalEntries?: CreateJournalEntryDto[];
}
```

### 5.2 List Query DTO (`get-cash-advance-list-query.dto.ts`)
```typescript
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class GetCashAdvanceListQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number = 10;

  @ApiPropertyOptional({ description: 'Search transNo, party name, or remarks' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by branch unit' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  branchUnitId?: number;

  @ApiPropertyOptional({ description: 'Filter by status (DRAFT, FOR_APPROVAL, APPROVED, POSTED)' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ example: 'documentDate', default: 'documentDate' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'documentDate';

  @ApiPropertyOptional({ example: 'desc', enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
```

---

## 6. Step 3: REST Controller (`<submodule>.controller.ts`)

Controllers must remain thin: handle decorators, user extraction, route paths, and forward calls to the service layer.

```typescript
import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CashAdvanceService } from './cash-advance.service';
import { CashAdvanceLookupService } from './services/cash-advance-lookup.service';
import { CreateCashAdvanceDto } from './dto/create-cash-advance.dto';
import { UpdateCashAdvanceDto } from './dto/update-cash-advance.dto';
import { GetCashAdvanceListQueryDto } from './dto/get-cash-advance-list-query.dto';
import { UpdateCashAdvanceStatusDto } from './dto/update-cash-advance-status.dto';
import {
  CashAdvanceContainerResponseDto,
  CashAdvanceListResponseDto,
  CashAdvanceNumberSuggestionResponseDto,
  SaveCashAdvanceResponseDto,
} from './dto/cash-advance-response.dto';

@UseGuards(JwtAuthGuard)
@ApiTags('Cash Advance')
@Controller({
  path: 'cash-disbursement/cash-advance',
  version: '1',
})
export class CashAdvanceController {
  constructor(
    private readonly cashAdvanceService: CashAdvanceService,
    private readonly cashAdvanceLookupService: CashAdvanceLookupService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List cash advances with pagination and filters' })
  @ApiOkResponse({ type: CashAdvanceListResponseDto })
  findAll(@CurrentUser() user: AuthUser, @Query() query: GetCashAdvanceListQueryDto) {
    return this.cashAdvanceService.findAll(user, query);
  }

  @Get('transaction-number')
  @ApiOperation({ summary: 'Suggest the next sequential cash advance transaction number' })
  @ApiOkResponse({ type: CashAdvanceNumberSuggestionResponseDto })
  suggestTransactionNumber(@CurrentUser() user: AuthUser, @Query() query: GetCashAdvanceListQueryDto) {
    return this.cashAdvanceService.suggestTransactionNumber(user, query.branchUnitId);
  }

  @Get('lookups/parties')
  @ApiOperation({ summary: 'Get active party options with credit and advance balances' })
  @ApiOkResponse({ description: 'Party options retrieved' })
  findPartyOptions(@CurrentUser() user: AuthUser) {
    return this.cashAdvanceLookupService.findParties(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single cash advance by ID with snapshots and journal entries' })
  @ApiOkResponse({ type: CashAdvanceContainerResponseDto })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.cashAdvanceService.findOne(user, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new cash advance document' })
  @ApiCreatedResponse({ type: SaveCashAdvanceResponseDto })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCashAdvanceDto) {
    return this.cashAdvanceService.create(user, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an editable cash advance (DRAFT or DISAPPROVED only)' })
  @ApiOkResponse({ type: SaveCashAdvanceResponseDto })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateCashAdvanceDto) {
    return this.cashAdvanceService.update(user, id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Transition cash advance status (Submit, Approve, Disapprove, Post, Cancel)' })
  @ApiOkResponse({ type: SaveCashAdvanceResponseDto })
  updateStatus(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateCashAdvanceStatusDto) {
    return this.cashAdvanceService.updateStatus(user, id, dto);
  }
}
```

### 6.1 Shared Lookup Ownership

Do not add a transaction-local lookup endpoint when the selector is already owned by a shared Maintenance or Tax API. Transaction modules may expose workflow-specific lookups, but generic master-data selectors should be reused.

Use these boundaries:

| Lookup need | Preferred owner | When transaction-local is allowed |
| --- | --- | --- |
| Parties, vendors, customers, employees | Party Maintenance lookup API | Only when the option payload includes workflow-only balances, eligibility, or document-specific restrictions. |
| Posting accounts and account options | Chart of Accounts or Default Account lookup API | Only when account eligibility depends on the transaction workflow. |
| Responsibility centers | Responsibility Center lookup API | Only when hierarchy or branch eligibility is workflow-specific. |
| Terms, payment types, services, warehouses, units, discounts | Existing Maintenance lookup API | Only when the module needs additional workflow-calculated metadata. |
| VAT, EWT, CWT, WVAT, FWT codes and rates | Tax API | Do not duplicate tax rows in transaction controllers. |
| Tax default account titles and codes | `GET /api/v1/tax/default-account-options` | Add a new Tax classification for repeated-use groups instead of hardcoding account defaults. |
| Transaction numbers, copy-from sources, available balances | Transaction module API | These are workflow-specific and remain transaction-owned. |

Frontend consumers should wrap shared lookup APIs in shared services and hooks when more than one module uses the same selector. See the frontend guide at `gr8bookslite-frontend/docs/shared-frontend-lookup-services.md`.

Do not create frontend constants for default chart account codes or titles such as Input VAT, Output VAT, Expanded Withholding Tax, Cash on Hand, or Cash in Bank. Resolve those through the relevant API and preserve existing record values only as edit/view compatibility options.

---

## 7. Step 4: Core Service Workflows (`<submodule>.service.ts`)

The service layer orchestrates transaction numbers, master data snapshots, relational inserts, and General Ledger posting.

### 7.1 Transaction Number Resolution
```typescript
import { resolveTransactionNumberForCompanyBranch } from '../../master/transaction-number-sequences/utils/transaction-number-sequence.util';

const CashAdvanceModuleCode = 'CA';

async function resolveTransNo(tx: Prisma.TransactionClient, companyId: number, branchUnitId: number | null, requestedNo?: string | null) {
  return resolveTransactionNumberForCompanyBranch(tx, {
    branchUnitId: branchUnitId ?? undefined,
    companyId,
    moduleCode: CashAdvanceModuleCode,
    requestedTransactionNumber: requestedNo,
    isIssued: async (transNo) => {
      const existing = await tx.cashAdvance.findFirst({
        where: { companyId, transNo, deletedAt: null },
        select: { id: true },
      });
      return Boolean(existing);
    },
  });
}
```

### 7.2 Master Data Snapshot Resolution
Never store a transaction relying solely on live foreign key pointers. Resolve snapshots during creation and mutation:

```typescript
async function resolvePartySnapshots(tx: Prisma.TransactionClient, companyId: number, partyCode: string) {
  const party = await tx.party.findFirst({
    where: { companyId, partyCodeNo: partyCode, deletedAt: null },
    include: { addresses: true },
  });

  if (!party) {
    throw new BadRequestException(`Party with code ${partyCode} was not found.`);
  }

  const defaultAddress = party.addresses.find((a) => a.isDefault) ?? party.addresses[0];
  const addressSnapshot = defaultAddress
    ? [defaultAddress.addressLine1, defaultAddress.cityMunicipality, defaultAddress.province].filter(Boolean).join(', ')
    : null;

  return {
    partyId: party.id,
    partyCodeSnapshot: party.partyCodeNo,
    partyNameSnapshot: party.partyName ?? `${party.firstName} ${party.lastName}`.trim(),
    addressSnapshot,
    contactPersonSnapshot: party.contactPerson,
    contactNoSnapshot: party.contactNumber,
    tinSnapshot: party.tin,
  };
}
```

### 7.3 General Ledger Entry Persistence (`JournalEntryHeader` & `JournalEntryDetail`)
When posting a transaction, write to `JournalEntryHeader` and `JournalEntryDetail` following [accounting_entries.md](file:///c:/Users/Bay/Integr8/gr8bookslite-backend/docs/agents/modules/accounting_entries.md):

```typescript
async function postToGeneralLedger(
  tx: Prisma.TransactionClient,
  companyId: number,
  branchUnitId: number | null,
  record: CashAdvance,
  entries: JournalEntryLineDto[]
) {
  // 1. Calculate and verify debit = credit balance
  const totalDebit = entries.reduce((sum, e) => sum + Number(e.debit || 0), 0);
  const totalCredit = entries.reduce((sum, e) => sum + Number(e.credit || 0), 0);

  if (Math.abs(totalDebit - totalCredit) > 0.001) {
    throw new BadRequestException(`Journal entries are out of balance: Debit=${totalDebit}, Credit=${totalCredit}`);
  }

  // 2. Allocate the next atomic journal entry number (jeno) for this company
  const latestJeno = await tx.journalEntryHeader.aggregate({
    where: { companyId },
    _max: { jeno: true },
  });
  const nextJeno = (latestJeno._max.jeno ?? 0n) + 1n;

  // 3. Create JournalEntryHeader
  const header = await tx.journalEntryHeader.create({
    data: {
      companyId,
      branchUnitId,
      jeno: nextJeno,
      referenceType: 'CA',
      referenceId: record.id,
      referenceNo: record.transNo,
      transactionDate: record.documentDate,
      currencyCode: record.currencyCode,
      exchangeRate: record.exchangeRate,
      particulars: record.remarks ?? `Cash Advance ${record.transNo}`,
      totalDebit: new Prisma.Decimal(totalDebit),
      totalCredit: new Prisma.Decimal(totalCredit),
      status: 'POSTED',
    },
  });

  // 4. Create JournalEntryDetail rows
  for (let i = 0; i < entries.length; i++) {
    const line = entries[i];
    await tx.journalEntryDetail.create({
      data: {
        companyId,
        jeno: nextJeno,
        lineNumber: i + 1,
        accountId: BigInt(line.accountId),
        accountCodeSnapshot: line.accountCodeSnapshot,
        accountTitleSnapshot: line.accountTitleSnapshot,
        debit: new Prisma.Decimal(line.debit || 0),
        credit: new Prisma.Decimal(line.credit || 0),
        partyCodeSnapshot: record.partyCodeSnapshot,
        partyNameSnapshot: record.partyNameSnapshot,
        responsibilityCenterId: line.responsibilityCenterId ? BigInt(line.responsibilityCenterId) : null,
        responsibilityCenterSnapshot: line.responsibilityCenterSnapshot,
        refNo: record.transNo,
      },
    });
  }
}
```

---

## 8. Step 5: System Administration & Cross-Cutting Hooks

### 8.1 Table Preferences Integration
List endpoints integrate with `table-preferences`. Provide table keys in the standard format:
`<domain>:<submodule>` (e.g., `cash-disbursement:cash-advance`).

### 8.2 Field Management Integration
Ensure all customizable input fields on the header and details reference the module scope code (`CA`, `APV`, `OR`, `SI`, etc.) so the client can dynamically toggle visibility and required rules.

### 8.3 Approval Management Routing
When `status` is transitioned to `FOR_APPROVAL`:
1. Check `ApprovalRule` where `companyId = user.companyId` and `moduleScope = CashAdvanceModuleCode`.
2. Evaluate rules against document `amount`.
3. If matching rules exist, create `ApprovalTransaction` and populate initial approvers in `ApprovalTransactionApprover`.

---

## 9. Step 6: OpenAPI Export & Frontend Orval Client Generation

Once the NestJS controller and DTOs are complete:

```bash
# 1. Start or export backend OpenAPI JSON
cd gr8bookslite-backend
npm run generate:openapi # Generates ../gr8bookslite-backend/openapi.json

# 2. Run Orval in frontend to generate typed React Query hooks and schemas
cd ../gr8bookslite-frontend
npm run orval:generate
```

This automatically produces:
- React Query hooks in `app/src/generated/api/<submodule>/<submodule>.ts`.
- TypeScript interfaces in `app/src/generated/api/gR8BooksNeoAPI.schemas.ts`.

After generation, add or update a frontend service only at the correct ownership boundary:

- Shared Maintenance selectors belong in shared maintenance services/hooks.
- Shared Tax selectors and tax default-account groups belong in `app/src/services/shared/tax`, `app/src/hooks/shared/tax`, and `app/src/data/shared/tax`.
- Module-local services should be thin aliases only when they are naming a shared selector for one screen.
- Do not map generated `void` or `unknown` responses with `any`; fix Swagger DTOs first, regenerate OpenAPI, then add narrow service-boundary types only where needed.

---

## 10. Step 7: Automated Testing with Jest (Mandatory Standards)

In accordance with [gr8booksneo_backend_testers.md](../../guides/quality/gr8booksneo_backend_testers.md), every transaction module must include Jest automated unit tests protecting business rules, state machines, accounting balancing, and calculations.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       MANDATORY JEST TEST COVERAGE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. <submodule>.service.spec.ts         │ State machine, readiness assertions│
│ 2. <submodule>-accounting.spec.ts      │ GL balancing (Debit == Credit)     │
│ 3. utils/<submodule>-totals.util.spec.ts│ Subtotals, VAT, EWT, rounding     │
│ 4. mappers/<submodule>.mapper.spec.ts  │ BigInt serialization, snapshots    │
│ 5. <submodule>.controller.spec.ts      │ Thin HTTP route forwarding         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 10.1 Service Unit Test Pattern (`<submodule>.service.spec.ts`)
Tests must verify status lifecycle boundaries, validation triggers, and multi-tenant security:

```typescript
import { BadRequestException } from '@nestjs/common';
import { CashAdvanceStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { TablePreferencesService } from '../../table-preferences/table-preferences.service';
import { CashAdvanceService } from './cash-advance.service';

type CashAdvanceServiceInternals = {
  isSubmittedStatus: (status: CashAdvanceStatus) => boolean;
  assertCashAdvanceReady: (record: {
    partyCodeSnapshot: string | null;
    partyNameSnapshot: string | null;
    accountCodeSnapshot: string | null;
    amount: Prisma.Decimal;
  }) => void;
};

describe('CashAdvanceService', () => {
  const service = new CashAdvanceService(
    {} as PrismaService,
    {} as TablePreferencesService,
  ) as unknown as CashAdvanceServiceInternals;

  describe('Status Transitions', () => {
    it('treats only submitted statuses as requiring complete data', () => {
      expect(service.isSubmittedStatus(CashAdvanceStatus.FOR_APPROVAL)).toBe(true);
      expect(service.isSubmittedStatus(CashAdvanceStatus.APPROVED)).toBe(true);
      expect(service.isSubmittedStatus(CashAdvanceStatus.POSTED)).toBe(true);
      expect(service.isSubmittedStatus(CashAdvanceStatus.DRAFT)).toBe(false);
      expect(service.isSubmittedStatus(CashAdvanceStatus.CANCELLED)).toBe(false);
    });
  });

  describe('Business Readiness Validation', () => {
    it('accepts complete record with party, account, and positive amount', () => {
      expect(() =>
        service.assertCashAdvanceReady({
          partyCodeSnapshot: 'EMP-001',
          partyNameSnapshot: 'John Doe',
          accountCodeSnapshot: '1010',
          amount: new Prisma.Decimal('1500.00'),
        }),
      ).not.toThrow();
    });

    it('rejects submission when account snapshot is missing', () => {
      expect(() =>
        service.assertCashAdvanceReady({
          partyCodeSnapshot: 'EMP-001',
          partyNameSnapshot: 'John Doe',
          accountCodeSnapshot: '',
          amount: new Prisma.Decimal('1500.00'),
        }),
      ).toThrow(BadRequestException);
    });

    it('rejects submission when amount is zero or negative', () => {
      expect(() =>
        service.assertCashAdvanceReady({
          partyCodeSnapshot: 'EMP-001',
          partyNameSnapshot: 'John Doe',
          accountCodeSnapshot: '1010',
          amount: new Prisma.Decimal('0.00'),
        }),
      ).toThrow(BadRequestException);
    });
  });
});
```

### 10.2 Accounting Balancing Test Pattern (`<submodule>-accounting.service.spec.ts`)
Must verify double-entry balancing rules and correct rejection of unbalanced payloads:

```typescript
import { BadRequestException } from '@nestjs/common';
import { CashAdvanceAccountingService } from './cash-advance-accounting.service';

describe('CashAdvanceAccountingService', () => {
  const service = new CashAdvanceAccountingService();

  it('validates balanced journal entries successfully', () => {
    expect(() =>
      service.validateJournalEntries([
        { accountId: '1', debit: 5000, credit: 0 },
        { accountId: '2', debit: 0, credit: 5000 },
      ]),
    ).not.toThrow();
  });

  it('throws BadRequestException when debits do not equal credits', () => {
    expect(() =>
      service.validateJournalEntries([
        { accountId: '1', debit: 5000, credit: 0 },
        { accountId: '2', debit: 0, credit: 4900 },
      ]),
    ).toThrow(BadRequestException);
  });

  it('enforces correct module referenceType', () => {
    expect(service.getReferenceType()).toBe('CA');
  });
});
```

### 10.3 Totals & Math Utility Test Pattern (`utils/<submodule>-totals.util.spec.ts`)
Must verify rounding, tax calculations (VAT, EWT), and line item accumulations:

```typescript
import { calculateTransactionTotals } from './cash-advance-totals.util';

describe('CashAdvanceTotalsUtil', () => {
  it('correctly rounds financial decimals to 2 places', () => {
    const lines = [
      { amount: 100.456 },
      { amount: 200.222 },
    ];
    const totals = calculateTransactionTotals(lines);
    expect(totals.grossAmount).toBe(300.68);
  });

  it('accurately computes withholding tax deductions', () => {
    const result = calculateTransactionTotals([{ amount: 1000 }], { ewtRate: 0.02 });
    expect(result.ewtAmount).toBe(20.00);
    expect(result.netAmount).toBe(980.00);
  });
});
```

### 10.4 Running Jest Tests
```bash
# Run tests for a specific transaction module:
npx jest src/modules/cash-disbursement/cash-advance

# Run tests in watch mode during development:
npm run test:watch src/modules/cash-disbursement/cash-advance

# Check test coverage for the module:
npx jest --coverage src/modules/cash-disbursement/cash-advance
```

---

## 11. Step 8: Frontend Integration Checklist

Verify frontend wiring against this checklist:
- [ ] **Next.js Routes**:
  - `app/(modules)/<domain>/<submodule>/page.tsx` (List)
  - `app/(modules)/<domain>/<submodule>/add/page.tsx` (Create)
  - `app/(modules)/<domain>/<submodule>/edit/[id]/page.tsx` (Edit)
  - `app/(modules)/<domain>/<submodule>/view/[id]/page.tsx` (View / Approve / Post)
- [ ] **React Query Hooks**: Form and List components consume generated `useGet<Module>List`, `useCreate<Module>`, `useUpdate<Module>`, and `useUpdate<Module>Status`.
- [ ] **Shared Lookup Services**: Reuse shared frontend lookup services/hooks for Maintenance and Tax selectors before adding module-local lookup code.
- [ ] **Mock Data Elimination**: Remove all static mock arrays (`mockData.ts`) and ensure all dropdowns and records load from the live API. Static options are allowed only for true UI enums such as Yes/No or fixed workflow states.
- [ ] **Tax Defaults**: Party tax defaults use shared tax helpers under `app/src/data/shared/tax`; tax default account titles/codes use the Tax default-account API, never hardcoded frontend account constants.
- [ ] **Cache Invalidation**: On successful mutation, invalidate queries using the base path:
  ```typescript
  queryClient.invalidateQueries({ queryKey: ['/v1/<domain>/<submodule>'] });
  ```
- [ ] **Table Preferences**: List page wires `useTablePreferences('<domain>:<submodule>')`.
- [ ] **Double-Entry Validation**: Frontend checks that `accountingEntries` have equal debits and credits before allowing submission or posting.
- [ ] **Signatories & PDF**: Report preview renders BIR form layout and signatories via `@react-pdf/renderer`.

---

## 12. Verification & Quality Assurance

Run the following checks to ensure production readiness:

```bash
# Backend lint, tests, and build:
cd gr8bookslite-backend
npm run lint
npm test # Runs all Jest unit specs including your module
npm run build

# Frontend lint and build:
cd ../gr8bookslite-frontend
npm run lint
npm run build
```
