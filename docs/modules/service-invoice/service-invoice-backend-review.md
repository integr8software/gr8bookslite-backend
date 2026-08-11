# Service Invoice Backend Review

## Scope

This document reviews the current Service Invoice implementation and identifies the backend work required to complete it. This is an analysis and implementation plan only. No application code or database schema was changed as part of this review.

## Executive Summary

Service Invoice currently exists as a frontend prototype. The frontend has pages, forms, list views, accounting-entry editing, local validation, and local status controls, but it persists records in browser `localStorage`.

The backend currently contains the `SVI` platform module and sidebar registration, but it does not contain a persisted Service Invoice transaction model, NestJS module, controller, DTOs, service, migration, API client, or dedicated tests.

The recommended implementation is to follow the existing Accounts Payable Voucher transaction pattern while reusing the shared Gr8Books Neo foundations for access control, branch/company scope, transaction numbering, parties, terms, chart accounts, responsibility centers, service maintenance, audit fields, and generic journal entries.

## Current Frontend Implementation

Relevant files:

- `app/(modules)/sales/service-invoice/page.tsx`
- `app/(modules)/sales/service-invoice/add/page.tsx`
- `app/(modules)/sales/service-invoice/edit/[recordId]/page.tsx`
- `app/(modules)/sales/service-invoice/view/[recordId]/page.tsx`
- `app/src/data/modules/sales/service-invoice/ServiceInvoiceData.ts`
- `app/src/hooks/modules/sales/service-invoice/useServiceInvoice.ts`
- `app/src/types/modules/sales/service-invoice/ServiceInvoiceTypes.ts`
- `app/src/validations/modules/sales/service-invoice/ServiceInvoiceValidation.ts`
- `app/src/ui/modules/sales/service-invoice/`

The frontend currently uses:

- hardcoded customer options
- hardcoded currencies, terms, accounts, and responsibility centers
- mock records
- browser `localStorage`
- client-side filtering and pagination
- local status updates
- client-side accounting-entry calculations

There is currently no Service Invoice-specific frontend API client or BFF integration.

The current frontend workflows are therefore local only:

- list: reads mock/localStorage records
- add: creates a local record
- edit: updates a local record
- view: reads a local record
- status changes: update local state only
- delete: no complete delete workflow currently exists
- PDF/report preview: uses local form data

## Current Frontend Contract

The frontend model includes:

- customer and party information
- document, invoice, transaction, reference, project, sales order, and purchase order references
- document and due dates
- currency and exchange rate
- service lines
- VAT, WVAT, EWT, and discount values
- responsibility center
- accounting entries
- status

The frontend status values are currently title case:

```text
Draft
For Approval
Posted
Disapproved
Cancelled
```

The backend should use a canonical status representation and the frontend should map it for display.

Current frontend validation only verifies:

- customer name exists
- transaction number exists
- document date exists
- at least one line has a positive amount

Backend validation must remain authoritative for IDs, tenant scope, dates, amounts, taxes, account validity, transaction numbers, journal balance, and status transitions.

## Platform Metadata Already Present

Service Invoice is registered as the `SVI` module in:

- `prisma/seeds/moduleCatalog.ts`
- `prisma/seeds/moduleSystemCatalog.ts`

This provides platform catalog and sidebar metadata only. It does not provide a transaction implementation or persistence model.

## Reusable Backend Foundations

### Accounts Payable Voucher Pattern

The closest completed persisted transaction is Accounts Payable Voucher:

`src/modules/accounts-payable/accounts-payable-voucher/`

Its service demonstrates the preferred pattern:

- resolve active company and branch context
- enforce permissions
- scope every lookup by company
- use shared transaction numbering
- validate accounting payloads
- perform document, detail, and journal writes inside `prisma.$transaction()`
- support list, detail, create, update, and status operations
- attach audit information
- use generic journal headers and details

Service Invoice should follow this pattern instead of introducing a separate transaction architecture.

### Transaction Numbering

Reuse:

`src/modules/system-administration/transaction-number-sequences/services/transaction-number-sequence-generator.service.ts`

Use module code `SVI`. The service already supports company/branch scope, automatic numbering, manual numbering, default sequence creation, and duplicate-number checks.

### Service Maintenance

Service Maintenance already exists as a company-scoped model:

`prisma/schema.prisma`, model `ServiceMaintenance`

It stores service names and revenue chart-account mappings. A Service Invoice should use these records where the business flow requires a maintained service selection, rather than duplicating service names and account mappings in the invoice module.

### Shared Accounting UI

The shared frontend accounting-entry table already provides common editing behavior:

`app/src/ui/shared/accounting-entry/AccountingEntryTable.tsx`

Service Invoice-specific accounting rules should remain module-owned. The shared component should not become a universal accounting calculation engine.

### Generic Journal Persistence

Use the existing `JournalEntryHeader` and `JournalEntryDetail` models for posted accounting entries.

Recommended reference values:

```text
referenceType = SVI
referenceId = serviceInvoice.id
```

## Backend Work Required

No dedicated backend implementation was found for:

- Service Invoice Prisma model
- Service Invoice line/detail model
- NestJS module
- controller
- DTOs
- response mappers
- lookup service
- accounting validation service
- status workflow
- migration
- API client
- dedicated tests

## Recommended Database Design

Create dedicated models, for example:

- `ServiceInvoice`
- `ServiceInvoiceLine`

The header should include:

- `companyId`
- `branchUnitId`
- customer party ID
- transaction number
- invoice number and reference number
- document date and due date
- currency code and exchange rate
- project and related-document references
- party/address/contact snapshots
- net, VAT, WVAT, EWT, discount, and gross totals
- status
- created/updated user IDs
- timestamps and soft-delete fields

The line model should include:

- invoice ID
- line number
- service-maintenance reference where applicable
- description and particulars
- quantity and amounts
- VAT/WVAT/EWT fields
- discount fields
- responsibility-center ID and snapshot
- currency and exchange-rate values where required

Recommended constraints:

- unique company, branch, and transaction number
- unique invoice and line number
- indexes for company, branch, status, document date, and customer
- company-scoped validation for every referenced record

Do not reuse `subscription_invoices`. That table belongs to SaaS billing and is not an ERP sales document.

## Recommended API

Follow the existing versioned NestJS controller pattern:

```text
GET    /api/v1/sales/service-invoice
GET    /api/v1/sales/service-invoice/transaction-number
GET    /api/v1/sales/service-invoice/lookups/parties
GET    /api/v1/sales/service-invoice/lookups/terms
GET    /api/v1/sales/service-invoice/lookups/responsibility-centers
GET    /api/v1/sales/service-invoice/lookups/services
GET    /api/v1/sales/service-invoice/:id
POST   /api/v1/sales/service-invoice
PATCH  /api/v1/sales/service-invoice/:id
PATCH  /api/v1/sales/service-invoice/:id/status
```

The frontend should call these through the existing BFF route, for example:

```text
/api/backend/sales/service-invoice
```

The exact response envelope should follow the completed transaction modules, including records, pagination, statistics, and permissions where applicable.

## Recommended Service Responsibilities

### Service Invoice Service

- resolve active company and branch
- enforce module permissions
- list and retrieve invoices
- validate references
- create and update invoice documents
- coordinate transaction numbering
- coordinate accounting validation and journal persistence
- apply status transitions

### Service Invoice Lookup Service

- customer parties only
- active payment terms
- active responsibility centers
- active services from Service Maintenance
- valid posting accounts or configured account mappings

### Service Invoice Accounting Service

- recalculate totals from line input
- validate tax and withholding values
- resolve company chart accounts
- validate debit/credit rules
- validate balanced journals
- validate persisted data before posting

## Accounting Considerations

The current frontend displays account codes such as:

- `AR-TRADE`
- `SALES-DISC`
- `VAT-OUT`
- `SRV-FEE`

These must not be trusted as authoritative account records. The backend should resolve accounts through company chart accounts, default account mappings, and Service Maintenance revenue mappings.

The current frontend formula requires finance confirmation. Discounts, VAT, WVAT, and EWT may cause the displayed debit and credit rows to become unbalanced depending on whether gross values already include those adjustments.

Before implementation, confirm:

- whether the invoice is AR-based or cash-based
- how discounts affect the revenue and receivable entries
- which accounts receive VAT, WVAT, and EWT
- whether accounting rows are user-editable or backend-generated
- whether a posted invoice can be cancelled or must be reversed

## Recommended Status Lifecycle

Use a canonical backend status contract:

```text
DRAFT
→ FOR_APPROVAL
→ POSTED
```

Possible alternative paths:

```text
DRAFT → CANCELLED
FOR_APPROVAL → DISAPPROVED
POSTED → CANCELLED or REVERSED
```

Posted invoices should be immutable. Cancellation must preserve audit and accounting history and must not silently delete the document.

## Frontend Integration Work

After the backend API exists:

1. Add `ServiceInvoiceApi.ts` using the existing API-client conventions.
2. Replace localStorage persistence with server queries and mutations.
3. Add real customer, term, service, account, and responsibility-center lookups.
4. Map backend BigInt IDs to frontend strings.
5. Map Decimal values consistently.
6. Map backend statuses to the existing display labels.
7. Add server-side list filtering, sorting, pagination, and statistics.
8. Refresh query data after create, update, and status mutations.
9. Make reports and PDF previews use persisted API data.
10. Decide whether soft-delete should be added before finalizing the API contract.

The existing frontend accounting generator may remain useful for draft preview, but the backend must be authoritative before approval or posting.

## Tests Required

### Backend

- DTO validation
- company and branch isolation
- customer, term, service, account, and responsibility-center scope
- automatic transaction-number generation
- manual transaction-number uniqueness
- create atomicity
- update atomicity
- totals and tax validation
- journal balance validation
- draft-only editing
- status transition rules
- posted-record immutability
- cancellation or reversal behavior
- permission enforcement
- journal idempotency
- list pagination, filtering, and statistics

### Frontend

- API request mapping
- API response mapping
- create, edit, and view flows
- lookup loading and error states
- decimal and date conversion
- status mapping
- accounting-entry editing
- controlled validation errors
- authorization errors
- removal of localStorage persistence after integration

## Risks and Open Questions

- The current localStorage prototype is not tenant-safe, auditable, or concurrency-safe.
- The frontend can currently change status without backend authorization.
- Mock party, term, account, currency, and responsibility-center values are not production data.
- Current reports are not backed by persisted transaction records.
- There is no current delete workflow.
- Service Invoice may need a formal relation to `ServiceMaintenance`; the frontend currently mixes free-text service information and account selection.
- Approval and posting rules must be confirmed before schema and status implementation.
- Accounting formulas require finance validation before production posting is enabled.

## Recommended Implementation Order

1. Confirm accounting, tax, status, cancellation, and service-selection rules.
2. Finalize the Service Invoice header and line schema.
3. Add the Prisma migration and indexes.
4. Implement DTOs, response types, and mappers.
5. Implement company/branch-scoped lookups.
6. Implement `SVI` transaction-number integration.
7. Implement create and update inside Prisma transactions.
8. Implement accounting validation and generic journal persistence.
9. Implement status transitions and audit behavior.
10. Add the controller and OpenAPI routes.
11. Add backend tests and run migration tests on disposable local PostgreSQL.
12. Replace the frontend localStorage store with API queries and mutations.
13. Add frontend integration tests.
14. Validate create, edit, view, approval, posting, cancellation, and reporting end to end.

## Final Assessment

Service Invoice is not backend-complete yet. The safest completion path is a dedicated Service Invoice transaction model and module built using the existing Accounts Payable Voucher conventions, while reusing shared access control, numbering, service maintenance, responsibility centers, chart accounts, and generic journal persistence.

No old transaction architecture should be introduced, and `subscription_invoices` must remain reserved for SaaS billing.
