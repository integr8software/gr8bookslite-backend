# PayMongo Payment Attempt Refactor Implementation

## Overview

This implementation refactors Phase 2 manual PayMongo checkout from the older payment request model into a payment attempt model.

The final runtime model is:

```text
subscription_invoices
  -> financial obligation

billing_payment_attempts
  -> one attempt to pay one invoice

billing_webhook_events
  -> provider event audit and idempotency

company_subscriptions
  -> subscription entitlement state

billing_payment_methods
  -> saved AUTO billing methods only
```

## Architecture Changes

### Invoice Ownership

Manual checkout now creates or reuses an `OPEN` `subscription_invoices` row before creating a PayMongo Checkout Session.

The invoice stores immutable billing snapshot fields:

- plan code
- plan name
- billing cycle
- description
- quantity
- unit amount
- subtotal
- discount
- tax
- total amount
- currency
- period start
- period end
- purpose
- billing mode
- issue date
- due date

This protects historical billing display and reconciliation even if the plan or price changes later.

### Payment Attempts

The old `billing_payment_requests` model has been replaced by `billing_payment_attempts`.

Each attempt stores:

- invoice id
- company id
- owner user id
- company subscription id
- purpose
- billing mode
- payment status
- application status
- provider checkout session id
- provider payment intent id
- provider payment id
- attempt number
- amount and currency
- provider payload snapshot
- payment timestamps
- application retry metadata

One invoice can have many attempts.

### Separate Payment And Application State

Payment status is now payment-only:

```text
PENDING
AWAITING_PAYMENT
PAID
FAILED
EXPIRED
CANCELED
```

Business application status is separate:

```text
PENDING
PROCESSING
APPLIED
FAILED
```

This means:

- PayMongo confirmation sets attempt `PAID`.
- PayMongo confirmation sets invoice `PAID`.
- Local subscription/company/onboarding activation runs separately.
- If activation fails, the attempt remains `PAID` and is retryable.

## Webhook Flow

PayMongo webhook handling now follows this flow:

```text
Receive webhook
Verify signature
Store/find billing_webhook_events
Mark event PROCESSING
Map event to local resource
Update payment attempt and invoice state
Mark webhook PROCESSED
Run payment application service
```

Unknown valid events are stored and marked `IGNORED`.

Duplicate processed events return success idempotently.

## Application Service

Added:

```text
src/modules/billing/services/billing-payment-application.service.ts
```

Main method:

```ts
applyPaidAttempt(attemptId: number)
```

Responsibilities:

- verify attempt exists
- verify attempt status is `PAID`
- verify invoice status is `PAID`
- verify amount and currency match
- prevent duplicate application
- activate or extend subscription
- activate provisioning company
- complete onboarding billing
- mark application `APPLIED`
- record application failure for retry

This service does not call PayMongo and never creates a new charge.

## API Compatibility

New preferred endpoint:

```text
GET /api/v1/billing/payment-attempts/:paymentAttemptId
```

Compatibility endpoint retained:

```text
GET /api/v1/billing/payment-requests/:paymentRequestId
```

Manual checkout response now returns both:

```json
{
  "paymentAttemptId": 123,
  "paymentRequestId": 123
}
```

`paymentRequestId` is deprecated but kept for frontend rollout compatibility.

## Retry Application

Added admin-only retry endpoint:

```text
POST /api/v1/billing/payment-attempts/:paymentAttemptId/retry-application
```

Rules:

- restricted to super admin
- does not create a PayMongo checkout
- does not charge again
- only retries local business activation for an already paid attempt

## Frontend Changes

Frontend manual billing now:

- receives `paymentAttemptId`
- still accepts legacy `paymentRequestId`
- fetches `/billing/payment-attempts/:id`
- displays payment status separately from invoice and activation status

This prevents showing a payment as unpaid when PayMongo already confirmed it but local activation is still pending or failed.

## Migration Notes

The Phase 2 migration was updated to create:

- `BillingPaymentAttemptStatus`
- `BillingApplicationStatus`
- `SubscriptionInvoiceStatus`
- `billing_payment_attempts`
- invoice snapshot columns on `subscription_invoices`
- webhook lifecycle fields
- provider uniqueness constraints
- attempt-number uniqueness per invoice

Important deployment note:

If `20260710084724_add_manual_billing_checkout_requests` has already been applied in an environment, do not blindly deploy the modified migration. In that case, create a forward-only migration that renames/backfills the existing table instead.

For environments where Phase 2 has not yet been deployed, this migration is the intended target shape.

## Idempotency Rules

Manual checkout creation:

- reuses an existing `OPEN` invoice when obligation-defining fields match
- reuses an existing `AWAITING_PAYMENT` attempt if it has a usable checkout URL
- creates a new attempt after failed, expired, or canceled attempts
- never reuses a paid attempt

Webhook processing:

- duplicate provider events are idempotent
- a paid invoice is not applied twice
- a second distinct paid attempt for an already-paid invoice is marked for reconciliation instead of silently double-applying

## Known Limits

- A full `billing_payments` ledger is intentionally not introduced in this phase.
- Refunds, credit notes, and payment allocation tables remain future work.
- Abandoned provisioning company cleanup is documented as an operational follow-up; no scheduler framework was added.

## Operational Checks

Useful SQL checks:

```sql
SELECT id, status, purpose, total_amount_in_cents, amount_paid_in_cents
FROM subscription_invoices
ORDER BY id DESC
LIMIT 20;

SELECT id, subscription_invoice_id, status, application_status, external_checkout_session_id
FROM billing_payment_attempts
ORDER BY id DESC
LIMIT 20;

SELECT event_id, event_type, processing_status, processing_attempts, last_error
FROM billing_webhook_events
ORDER BY id DESC
LIMIT 20;
```

## Deployment Commands

For a normal backend deployment after review:

```bash
npm ci
node scripts/run-with-env.cjs .env prisma migrate deploy
node scripts/run-with-env.cjs .env prisma generate
npm run build
pm2 restart gr8booksneo-backend-shared-dev --update-env
pm2 save
```

If an environment already applied the old Phase 2 migration, stop before `migrate deploy` and create a forward-only repair migration instead.

## Future Follow-Up

Recommended next phase:

- add a reconciliation report for paid attempts with failed application
- add support/admin UI for retrying application
- add abandoned provisioning company archival command
- add future `billing_payments`, `billing_refunds`, `billing_credit_notes`, and `payment_allocations` tables when refund/accounting scope is implemented
