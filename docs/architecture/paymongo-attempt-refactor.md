We have approved the architectural direction in:

docs/architecture/paymongo-payment-attempt-refactor-proposal.md

Now implement the refactor.

IMPORTANT:

- First inspect the current Prisma schema, billing services, PayMongo webhook handling, DTOs, controllers, frontend billing services, existing migrations, and tests.
- Do not blindly follow the proposal if the current code differs. Preserve current working behavior unless this prompt explicitly changes it.
- Make the implementation production-safe, migration-safe, idempotent, and backward-compatible where practical.
- Do not delete billing history.
- Do not expose sensitive PayMongo payloads or secrets.
- Do not keep database transactions open while calling PayMongo APIs.

## Main Objective

Refactor the current manual billing architecture from:

billing_payment_requests

to:

billing_payment_attempts

with invoice ownership, separate payment and application states, stronger webhook idempotency, and safe retry behavior.

The target separation is:

subscription_invoices

- Represents the financial obligation.
- Becomes PAID when PayMongo confirms successful payment.
- Does not wait for subscription/company/onboarding activation to succeed.

billing_payment_attempts

- Represents exactly one attempt to pay one invoice.
- Keeps provider checkout/payment identifiers.
- Keeps payment status separate from business application status.

billing_webhook_events

- Immutable provider event audit.
- Handles idempotency, diagnostics, and replay safety.
- Does not act as the primary business state.

company_subscriptions

- Represents current subscription entitlement.
- Must not become the detailed payment history table.

billing_payment_methods

- Saved reusable methods for AUTO billing only.

## Critical Accounting Rule

Payment confirmation and business application must be separate.

Correct flow:

PayMongo confirms payment
-> payment attempt status = PAID
-> invoice status = PAID
-> business application runs
-> application status = APPLIED

If business application fails:

payment attempt status remains PAID
invoice remains PAID
application status becomes FAILED or remains retryable
subscription/company/onboarding may remain temporarily unchanged

Do not keep a financially settled invoice OPEN merely because entitlement application failed.

## Payment Attempt Status

Use payment-only lifecycle states:

PENDING
AWAITING_PAYMENT
PAID
FAILED
EXPIRED
CANCELED

Definitions:

PENDING

- Local attempt exists but provider checkout session has not yet been created.

AWAITING_PAYMENT

- Provider checkout exists and the customer can pay.

PAID

- PayMongo has confirmed the payment.

FAILED

- Provider has confirmed failure.

EXPIRED

- The checkout or payment attempt expired.

CANCELED

- The customer or provider canceled the attempt.

Do not use APPLIED as the payment status.

## Separate Application Status

Add a separate application status, for example:

PENDING
PROCESSING
APPLIED
FAILED

Recommended fields:

application_status
application_attempts
last_application_attempt_at
application_error
applied_at

Rules:

- A PAID payment attempt starts application as PENDING.
- PROCESSING must be set before applying business changes.
- APPLIED means all local business changes were committed.
- FAILED means payment remains confirmed but local business application failed.
- A failed application must be retryable without charging again.
- If already APPLIED, return success idempotently.

## Invoice Behavior

subscription_invoices must represent both MANUAL and AUTO subscription-related invoices.

Invoice status should include, where appropriate:

DRAFT
OPEN
PAID
VOID
EXPIRED
UNCOLLECTIBLE

Rules:

- Invoice becomes PAID when provider payment is confirmed.
- Invoice status must not depend on whether entitlement application succeeds.
- Failed, canceled, or expired attempts do not automatically void the invoice.
- An invoice remains OPEN while another payment attempt may still be made.
- Only void an invoice when the business obligation itself is canceled.
- Invoice expiry is separate from checkout expiry.

## Immutable Invoice Snapshot

Do not rely only on current plan and plan price records.

When creating a subscription invoice, store immutable snapshot values such as:

plan_code
plan_name
billing_cycle
description
quantity
unit_amount_in_cents
subtotal_in_cents
discount_in_cents
tax_in_cents
total_amount_in_cents
currency
period_start
period_end
purpose
billing_mode
issued_at
due_at

Foreign keys to subscription_plans and subscription_plan_prices may remain, but historical invoice display and reconciliation must remain correct after plan or price records change.

## Open Invoice Reuse Rules

The system may reuse an existing OPEN invoice only when all obligation-defining fields match:

- same company or onboarding owner
- same company subscription, where applicable
- same payment purpose
- same plan
- same plan price
- same billing cycle
- same amount
- same currency
- same entitlement period
- invoice is still payable
- invoice is not VOID, EXPIRED, or PAID

If the selected plan, amount, billing cycle, or entitlement period changes:

- do not mutate the issued invoice
- void or expire the old invoice according to business rules
- create a new invoice

Do not alter invoice financial snapshots after payment attempts exist.

## Database Refactor

Implement a zero-data-loss migration.

### Rename

Rename:

billing_payment_requests
to
billing_payment_attempts

Rename Prisma model:

BillingPaymentRequest
to
BillingPaymentAttempt

Rename status enum:

BillingPaymentRequestStatus
to an appropriate payment-only status enum

Update:

- relation names
- service names
- repository names
- DTO names
- variable names
- tests
- comments
- documentation

Keep temporary compatibility aliases only where needed.

### Invoice Ownership

Add:

subscription_invoice_id

to payment attempts.

Migration sequence:

1. Add the relation as nullable.
2. Create or backfill manual invoice rows for existing payment requests.
3. Link each existing payment request/attempt to an invoice.
4. Verify all migrated rows.
5. Make the relation required only after the backfill is safe.
6. Add the foreign key and useful indexes.

Do not drop or recreate the original payment history table in a way that loses IDs or timestamps.

## Recommended Payment Attempt Fields

Ensure the model supports at least:

id
subscription_invoice_id
company_id
owner_user_id
company_subscription_id
purpose
billing_mode
provider
attempt_number
status
application_status
provider_checkout_session_id
provider_payment_intent_id
provider_payment_id
payment_method_type
amount_in_cents
currency
confirmed_at
failed_at
expired_at
canceled_at
application_attempts
last_application_attempt_at
application_error
applied_at
raw_provider_payload
metadata
created_at
updated_at

Do not duplicate plan and pricing data unnecessarily if the invoice owns the immutable financial snapshot.

## Database Constraints And Indexes

Add database-level protection, not only service-level checks.

Recommended unique constraints:

- provider + provider_checkout_session_id
- provider + provider_payment_intent_id
- provider + provider_payment_id
- provider + provider_event_id on webhook events
- subscription_invoice_id + attempt_number

Use nullable-safe uniqueness behavior appropriate for PostgreSQL.

Add indexes for:

- subscription_invoice_id
- company_id
- owner_user_id
- status
- application_status
- provider checkout session id
- provider payment intent id
- provider payment id
- created_at

## Idempotency For Checkout Creation

Prevent duplicate checkout sessions caused by repeated frontend submission, retries, double clicks, or network timeouts.

Use a stable local idempotency strategy.

The implementation should:

- detect a reusable AWAITING_PAYMENT attempt for the same invoice when safe
- avoid creating a second active checkout accidentally
- allow a new attempt after the previous attempt is FAILED, EXPIRED, or CANCELED
- preserve attempt history
- never reuse a PAID attempt
- never create a second charge for an already PAID invoice

If PayMongo supports a request idempotency mechanism in the current integration, use it correctly. Otherwise implement safe local idempotency.

## Business Application Service

Create a dedicated service, for example:

BillingPaymentApplicationService

Recommended method:

applyPaidAttempt(attemptId: number): Promise<void>

Responsibilities:

- load payment attempt
- confirm payment status is PAID
- confirm invoice status is PAID
- confirm amount and currency match
- prevent duplicate application
- activate or extend subscription
- activate provisioning company
- complete onboarding billing
- update entitlement dates
- mark application status APPLIED
- remain idempotent
- record failure details and retry metadata

Rules:

- If already APPLIED, return success.
- If payment status is not PAID, do not apply.
- If invoice is not PAID, do not apply.
- Do not charge or create a new checkout during application retry.
- Apply all local business changes in one database transaction.
- Use row locking or equivalent concurrency control where practical.
- Do not perform PayMongo network calls inside the transaction.

## Transaction Boundaries

For provider checkout creation:

1. Create or reuse invoice locally.
2. Create local payment attempt.
3. Commit local transaction.
4. Call PayMongo outside the database transaction.
5. Update attempt with provider identifiers in a short transaction.
6. If provider creation fails, record attempt failure safely.

For webhook processing:

1. Persist or find webhook event.
2. Verify idempotency.
3. Map event to payment attempt.
4. In a short transaction:
   - lock relevant rows where appropriate
   - mark attempt PAID/FAILED/EXPIRED/CANCELED
   - mark invoice PAID when payment is confirmed
   - record provider identifiers and timestamps
5. Commit.
6. Trigger application service separately.
7. If application fails, keep payment and invoice states intact.

## Webhook Event Model

Replace a simple processed Boolean with a clearer processing lifecycle where practical:

RECEIVED
PROCESSING
PROCESSED
FAILED
IGNORED

Recommended fields:

provider_event_id
provider
event_type
processing_status
processing_attempts
last_processing_error
received_at
processing_started_at
processed_at
next_retry_at
raw_payload

Rules:

- raw_payload is immutable
- duplicate provider event IDs return success idempotently
- unknown but valid events are stored and marked IGNORED
- invalid signatures are rejected
- mapping failure is FAILED, not IGNORED
- entitlement application failure should not require PayMongo to resend the webhook
- a webhook may be considered PROCESSED once the durable payment and invoice state is saved
- entitlement application retry is tracked separately

## Provider Event Verification

Verify every PayMongo event type and payload path against:

- the current official PayMongo API/webhook format
- the event payloads already stored in this codebase
- the existing test webhook environment

Do not assume event names from the proposal are correct.

Create a typed event mapping layer.

Unknown event types:

- store the event
- mark it IGNORED
- return success
- do not treat them as payment failures

## Onboarding Ownership

Handle onboarding before a finalized company subscription exists.

Support nullable ownership where necessary, for example:

subscription_invoice.company_subscription_id nullable during onboarding
subscription_invoice.company_id nullable only when unavoidable
subscription_invoice.owner_user_id required
subscription_invoice.onboarding_draft_id optional

After successful provisioning:

- attach company_id
- attach company_subscription_id where applicable

Do not create fake subscription records only to satisfy non-null relations unless the current domain intentionally requires an INCOMPLETE subscription before payment.

Document the chosen ownership rule.

## Additional Company Provisioning

Manual additional-company checkout currently creates the company before payment.

Preserve safe behavior:

- company starts as PROVISIONING
- company remains inactive before payment
- successful paid attempt application activates it
- failed/canceled/expired attempts do not activate it

Add cleanup or archival logic for abandoned provisioning companies:

- no successful payment
- related invoice no longer payable
- older than a configurable retention period

Do not hard-delete immediately.
Prefer canceled, archived, or inactive state so support history remains available.

Add a maintenance service or scheduled cleanup mechanism if the project already has a suitable job framework. Otherwise document the cleanup command/process without adding unnecessary infrastructure.

## Retry Application Endpoint

If adding:

POST /billing/payment-attempts/:id/retry-application

it must not be a normal customer endpoint.

Restrict it to:

- internal worker
- authorized admin/support role
- system maintenance job

Before retrying, verify:

- payment status is PAID
- invoice status is PAID
- application status is not APPLIED
- provider identifiers are consistent
- amount matches invoice
- currency matches invoice
- no conflicting successful attempt exists

Log the retry action in the audit trail.

## Multiple Attempts Per Invoice

Support this correctly:

Invoice #1001

- Attempt 1: EXPIRED
- Attempt 2: CANCELED
- Attempt 3: PAID, application FAILED
- Attempt 3 retry: application APPLIED

Do not create a second payment attempt just to retry local business application.

Do not create multiple invoices for checkout retries when the financial obligation is unchanged.

## Successful Attempt Conflict Protection

Prevent multiple successful attempts from settling the same invoice twice.

Before marking an attempt PAID:

- verify invoice is not already paid by another attempt
- if the same provider payment is duplicated, treat it idempotently
- if a genuinely different payment settles an already paid invoice, record it as a reconciliation exception
- do not silently apply the subscription twice

Add explicit diagnostics for this case.

## Future Payment Ledger Compatibility

Do not create a full billing_payments table unless necessary for this phase.

However, design the attempt model so it does not become the permanent cash receipt/refund ledger.

Add documentation that future expansion may introduce:

billing_payments
billing_refunds
billing_credit_notes
payment_allocations

Do not put refund state directly into subscription state.

## API Compatibility

Long-term routes should move toward:

POST /billing/manual-checkout-sessions
GET /billing/payment-attempts/:id
GET /billing/invoices/:id
POST /billing/invoices/:id/payment-attempts
POST /internal/billing/payment-attempts/:id/retry-application

Preserve existing frontend behavior during migration.

Where the frontend still expects:

paymentRequestId

temporarily return both if needed:

paymentRequestId
paymentAttemptId

Mark the old field deprecated in code comments and API docs.

Do not break onboarding, renewal, or additional-company payment result pages.

## AUTO Billing

Do not break or unnecessarily rewrite AUTO billing.

AUTO remains:

saved payment method
-> PayMongo subscription
-> provider invoice/payment webhook
-> local invoice update
-> subscription state update

AUTO payment attempts may be added later, but this implementation should focus on the manual checkout refactor unless shared logic can be introduced safely.

Ensure:

- billing_payment_methods remains AUTO-only
- manual checkout does not save reusable payment methods
- manual billing uses auto_renew = false
- AUTO behavior remains covered by regression tests

## Frontend Changes

Update frontend terminology and APIs carefully.

Required behavior:

- create manual checkout
- receive paymentAttemptId
- redirect to PayMongo
- result page fetches payment attempt status
- show payment state separately from activation/application state

Suggested messages:

Payment confirmed, access is being activated.
Payment confirmed, but activation is delayed. Our system will retry automatically.
Payment canceled.
Payment expired.
Payment failed.

Do not show payment as unpaid when:

- attempt is PAID
- invoice is PAID
- application is still PENDING or FAILED

Keep compatibility with old response fields during rollout.

## Tests

Add or update unit, integration, and migration tests covering at least:

1. New manual invoice creation.
2. Open invoice reuse when all obligation fields match.
3. New invoice creation when plan or amount changes.
4. Multiple payment attempts for one invoice.
5. Checkout creation idempotency.
6. Duplicate webhook delivery.
7. Unknown webhook event marked IGNORED.
8. Invalid signature rejected.
9. Successful payment:
   - attempt becomes PAID
   - invoice becomes PAID
   - application runs
10. Application failure:

- attempt remains PAID
- invoice remains PAID
- application status becomes FAILED

11. Retry application:

- no new charge
- no new attempt
- application becomes APPLIED

12. Already-applied retry is idempotent.
13. Two concurrent webhook deliveries do not double-activate.
14. Two different successful attempts against one invoice produce a reconciliation exception.
15. Expired attempt leaves invoice OPEN when still payable.
16. Canceled attempt leaves invoice OPEN when still payable.
17. Additional company stays PROVISIONING before payment.
18. Additional company becomes active after successful application.
19. Onboarding invoice works before company subscription exists.
20. Price changes do not alter historical invoice snapshots.
21. AUTO billing regression tests still pass.
22. Existing frontend payment result flow remains compatible.
23. Migration preserves existing billing payment request rows and IDs.

## Migration Safety

Before implementation:

- inspect current data assumptions
- identify nullable columns
- identify existing provider ID duplicates
- identify orphaned payment requests
- identify manual payment requests without subscriptions
- identify already applied rows
- identify rows with missing amount or currency

Create a migration strategy that is safe for:

- local
- shared dev
- staging
- production

Do not use destructive reset commands.

For backfill:

- use deterministic mapping
- log or fail clearly on ambiguous records
- do not silently invent financial values
- include a verification query or script
- include rollback notes where feasible

## Validation Commands

Run the project’s existing guarded commands for:

- Prisma generate
- Prisma validate
- migration validation
- typecheck
- unit tests
- integration tests
- build
- frontend lint
- frontend build

Use the repository’s environment guard scripts.

Do not bypass database safety guards.

## Documentation

Update or create documentation covering:

1. Final billing architecture
2. Invoice lifecycle
3. Payment attempt lifecycle
4. Application lifecycle
5. Webhook lifecycle
6. Manual checkout sequence
7. Retry behavior
8. Idempotency rules
9. Onboarding ownership
10. Additional-company provisioning cleanup
11. API compatibility plan
12. Migration and deployment steps
13. Operational troubleshooting
14. Reconciliation exception handling
15. Future payment/refund ledger direction

Update the original proposal document with an implementation status section or create a separate implementation document.

## Deliverables

Implement the changes and provide:

1. Summary of architecture changes
2. Prisma schema changes
3. Migration files
4. Backfill logic
5. Backend service changes
6. Webhook changes
7. Application service
8. Controller and DTO changes
9. Frontend changes
10. Tests added or changed
11. Validation results
12. Deployment commands
13. Known limitations
14. Rollback considerations
15. Files changed
16. Recommended follow-up phase

## Stop Conditions

Stop and report before proceeding if:

- existing production data cannot be mapped safely
- invoice amounts cannot be reconstructed reliably
- provider IDs are duplicated ambiguously
- the current webhook payload format contradicts the assumed model
- the migration would require deleting payment history
- AUTO billing would be materially broken by the refactor

Do not hide these problems with fallback guesses.

## Final Instruction

Implement the approved refactor completely, but preserve working Phase 2 manual checkout behavior.

The final architecture must guarantee:

- one invoice represents one financial obligation
- one invoice may have many payment attempts
- confirmed payment settles the invoice immediately
- business application is separate and retryable
- duplicate webhooks do not double-apply
- retrying activation never charges again
- historical invoices remain correct after pricing changes
- existing payment history is preserved
- AUTO billing continues to work
