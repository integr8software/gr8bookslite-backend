# COA Implementation Specification for Codex

## Objective

Implement a production-ready Chart of Accounts (COA) module using:

- NestJS
- Prisma
- PostgreSQL (or SQL Server equivalent)
- Multi-company architecture
- Future ERP scalability

The implementation must support:

- Hierarchical Chart of Accounts
- Automatic account code generation
- Bank account integration
- Subsidiary ledgers
- Future General Ledger integration

---

# Architecture Overview

The accounting module will use two primary tables:

1. tblCOA
2. tblBankAccounts

Account codes are business identifiers.

Internal relations must use numeric IDs.

Never use AccountCode as a foreign key.

---

# tblCOA Design

Purpose:

Store only Chart of Accounts metadata and hierarchy.

Recommended schema:

```sql
CREATE TABLE tblCOA (
    Id BIGINT IDENTITY(1,1) PRIMARY KEY,

    CompanyId INT NOT NULL,

    ParentAccountId BIGINT NULL,

    AccountCode NVARCHAR(20) NOT NULL,

    AccountTitle NVARCHAR(250) NOT NULL,

    AccountLevel NVARCHAR(20) NOT NULL,

    AccountType NVARCHAR(50) NULL,

    AccountNature NVARCHAR(50) NULL,

    AccountGroup NVARCHAR(50) NULL,

    ReportAlias NVARCHAR(250) NULL,

    Class NVARCHAR(50) NULL,

    IsPostingAccount BIT NOT NULL DEFAULT(0),

    WithSubsidiary BIT NOT NULL DEFAULT(0),

    ContraAccount BIT NOT NULL DEFAULT(0),

    ShowTotal BIT NOT NULL DEFAULT(0),

    OrderNo INT NULL,

    Status NVARCHAR(20) NOT NULL DEFAULT('ACTIVE'),

    CurrencyCode NVARCHAR(10) NULL,

    DateCreated DATETIME NOT NULL DEFAULT(GETDATE()),
    DateModified DATETIME NULL,

    WhoCreated NVARCHAR(50) NULL,
    WhoModified NVARCHAR(50) NULL,

    DeletedAt DATETIME NULL
);
```

---

# tblCOA Indexes

Required:

```sql
CREATE UNIQUE INDEX IX_tblCOA_Company_AccountCode
ON tblCOA(CompanyId, AccountCode);

CREATE INDEX IX_tblCOA_Parent
ON tblCOA(ParentAccountId);

CREATE INDEX IX_tblCOA_Status
ON tblCOA(Status);

CREATE INDEX IX_tblCOA_Company_Status
ON tblCOA(CompanyId, Status);
```

---

# Account Levels

Supported levels:

```text
MAJOR
SUB1
SUB2
SUB3
SPECIFIC
```

Examples:

Major:

1000000000

Sub1:

1010000000

Sub2:

1010300000

Sub3:

1010301000

Specific:

1010301001

---

# Account Types

```text
ASSET
LIABILITY
EQUITY
REVENUE
EXPENSE
```

---

# Account Nature

```text
DEBIT
CREDIT
```

---

# Posting Rules

Only posting accounts may receive journal entries.

Examples:

Current Assets -> IsPostingAccount = false

Cash on Hand -> IsPostingAccount = true

Accounts Receivable -> IsPostingAccount = true

---

# Hierarchy Rules

Use:

```text
ParentAccountId
```

Never derive hierarchy solely from AccountCode.

AccountCode is a business identifier only.

---

# Automatic Account Code Generation

Create utility:

```text
generateNextAccountCode()
```

Requirements:

1. Query siblings.
2. Find first available sequence.
3. Fill gaps.
4. Prevent duplicates.
5. Scope by company.

Examples:

Sub1 under:

1000000000

Produces:

1010000000
1020000000
1030000000

Specific under:

1010300000

Produces:

1010300001
1010300002
1010300003

---

# Concurrency Rules

GET next-code is preview only.

During CREATE:

1. Start transaction.
2. Recalculate code.
3. Insert account.
4. Commit.

Backend owns numbering.

Frontend must never generate codes.

---

# tblBankAccounts Design

Purpose:

Store bank information separate from COA.

```sql
CREATE TABLE tblBankAccounts (
    Id BIGINT IDENTITY(1,1) PRIMARY KEY,

    CompanyId INT NOT NULL,

    CoaId BIGINT NOT NULL,

    BankName NVARCHAR(100) NOT NULL,

    Branch NVARCHAR(100) NULL,

    AccountNumber NVARCHAR(100) NOT NULL,

    AccountName NVARCHAR(250) NOT NULL,

    CurrencyCode NVARCHAR(10) NULL,

    IsDefault BIT NOT NULL DEFAULT(0),

    Status NVARCHAR(20) NOT NULL DEFAULT('ACTIVE'),

    DateCreated DATETIME NOT NULL DEFAULT(GETDATE()),
    DateModified DATETIME NULL
);
```

---

# COA to Bank Relationship

One COA account may have multiple bank accounts.

Example:

Cash in Bank

-> BDO Payroll
-> BDO Operating
-> BPI Main

Relationship:

tblCOA.Id

to

tblBankAccounts.CoaId

---

# API Endpoints

Required:

GET /api/v1/maintenance/chart-of-accounts

GET /api/v1/maintenance/chart-of-accounts/tree

GET /api/v1/maintenance/chart-of-accounts/:id

GET /api/v1/maintenance/chart-of-accounts/next-code

POST /api/v1/maintenance/chart-of-accounts

PATCH /api/v1/maintenance/chart-of-accounts/:id

PATCH /api/v1/maintenance/chart-of-accounts/:id/status

---

# Tree Endpoint

Must return:

```json
{
  "id": 1,
  "accountCode": "1010000000",
  "accountTitle": "Current Assets",
  "children": []
}
```

Backend should construct the hierarchy.

Frontend should not build the tree manually.

---

# Validation Rules

Reject:

- Duplicate account codes
- Invalid parent level
- Invalid account type
- Invalid account nature

Prevent:

- Posting to non-posting accounts
- Deleting accounts used in transactions

---

# Soft Delete Strategy

Never physically delete accounts.

Use:

DeletedAt

or

Status = INACTIVE

Accounting history must remain intact.

---

# Future ERP Readiness

Schema should support:

- General Ledger
- Journal Entries
- Trial Balance
- Balance Sheet
- Income Statement
- Cost Centers
- Multi-Branch Accounting
- Multi-Currency Accounting

Do not hardcode assumptions that prevent future expansion.

---

# Prisma Recommendations

Use:

- id as primary key
- accountCode as business key
- parentAccountId for hierarchy

Never use accountCode as a relation key.

---

# Implementation Order

Phase 1

1. Prisma schema
2. Migration
3. DTOs
4. Utility functions
5. Service layer
6. Controller layer
7. CRUD endpoints
8. Tree endpoint
9. Unit tests

Phase 2

1. Bank accounts module
2. Audit logging
3. Soft delete
4. Permissions

Phase 3

1. Journal entries
2. General ledger
3. Financial reports
4. Cost centers
5. Branch accounting

---

# Final Decision

Approved architecture:

- tblCOA
- tblBankAccounts

Hierarchy:
- ParentAccountId

Business Key:
- AccountCode

Internal Key:
- Id

Code Generation:
- Backend only

Deletion:
- Soft delete

Scalability:
- ERP-ready
