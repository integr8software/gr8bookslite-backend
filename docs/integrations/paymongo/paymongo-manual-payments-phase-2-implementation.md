# PayMongo Manual Payments Phase 2 Implementation

## Overview

Phase 2 adds real backend and frontend integration for `MANUAL` billing mode using PayMongo Checkout Sessions.

The existing `AUTO` subscription flow remains separate:

```text
AUTO
PayMongo subscription
-> saved payment method
-> recurring deduction
-> existing subscription webhooks
```

The new manual flow is:

```text
MANUAL
Billing payment request
-> PayMongo Checkout Session
-> one-time payment
-> checkout_session.payment.paid webhook
-> activate/apply subscription
-> no saved payment method
-> no automatic deduction
```

Redirect success is not treated as payment success. The webhook is the source of truth.

## Database Changes

Migration:

```text
prisma/migrations/20260710084724_add_manual_billing_checkout_requests/migration.sql
```

Added enums:

- `BillingMode`
  - `MANUAL`
  - `AUTO`
- `BillingPaymentPurpose`
  - `ONBOARDING`
  - `RENEWAL`
  - `ADDITIONAL_COMPANY`
- `BillingPaymentRequestStatus`
  - `PENDING`
  - `AWAITING_PAYMENT`
  - `PAID`
  - `FAILED`
  - `CANCELED`
  - `EXPIRED`
  - `APPLIED`

Added `company_subscriptions` columns:

- `billing_mode`
- `auto_renew`

Added table:

```text
billing_payment_requests
```

This table stores one manual payment attempt and links it to:

- company
- owner user
- company subscription
- subscription plan
- subscription plan price
- PayMongo checkout session
- PayMongo payment/payment intent identifiers when available

## Backend Endpoints

### Create Manual Checkout Session

```http
POST /api/v1/billing/checkout-sessions
```

Request:

```json
{
  "purpose": "ONBOARDING",
  "planCode": "ACCOUNTING_TRADING",
  "billingCycle": "YEARLY",
  "companyId": 1,
  "successUrl": "http://localhost:3001/billing/payment/success",
  "cancelUrl": "http://localhost:3001/billing/payment/cancelled"
}
```

`companyId` is optional for onboarding because the backend resolves the provisioned onboarding company from the user draft.

Response:

```json
{
  "paymentRequestId": 123,
  "checkoutSessionId": "cs_xxx",
  "checkoutUrl": "https://checkout.paymongo.com/...",
  "status": "AWAITING_PAYMENT"
}
```

### Get Manual Payment Request Status

```http
GET /api/v1/billing/payment-requests/:paymentRequestId
```

This is used by the frontend payment result page to display backend payment status.

## PayMongo Checkout Session

The backend creates a PayMongo Checkout Session with:

- one line item
- selected plan price
- `success_url`
- `cancel_url`
- manual billing metadata
- payment method types:
  - card
  - gcash
  - paymaya
  - qrph
  - dob
  - dob_ubp

Metadata includes:

- `billing_mode`
- `payment_purpose`
- `environment`
- `company_id`
- `owner_user_id`
- `subscription_plan_id`
- `subscription_plan_code`
- `subscription_plan_price_id`
- `billing_cycle`
- `company_subscription_id`
- `local_payment_request_id`

## Webhook Handling

Handled manual checkout events:

- `checkout_session.payment.paid`
- `checkout_session.payment.failed`
- `checkout_session.expired`
- `checkout_session.payment.expired`
- `checkout_session.payment.cancelled`
- `checkout_session.payment.canceled`

On `checkout_session.payment.paid`:

1. Locate `billing_payment_requests` by checkout session ID or metadata payment request ID.
2. Mark the payment request as `APPLIED`.
3. Mark the linked subscription as:
   - `ACTIVE`
   - `billingMode = MANUAL`
   - `autoRenew = false`
4. Set billing period dates from the selected plan price interval.
5. For onboarding payments, mark the onboarding draft billing as completed.
6. For additional company or renewal payments, ensure the company is active.

Failed, canceled, and expired checkout events only update the payment request status. They do not activate access.

## Frontend Integration

The Phase 1 mock service was replaced with:

```text
app/src/services/billing/ManualBillingApi.ts
```

Updated flows:

- onboarding manual billing
- workspace billing renewal
- additional company billing
- billing payment result screen

Removed the mock checkout page:

```text
app/billing/mock-checkout/page.tsx
```

The frontend now:

1. Calls `POST /billing/checkout-sessions`.
2. Redirects to PayMongo `checkoutUrl`.
3. Returns to `/billing/payment/:status`.
4. Reads backend payment request status using `GET /billing/payment-requests/:id`.

## Additional Company Behavior

Manual additional-company checkout needs a company ID for metadata and subscription ownership.

For manual billing:

1. The company is created first.
2. The backend stores it as `PROVISIONING` and inactive.
3. The frontend creates a manual checkout session for that company.
4. The webhook activates the company after successful payment.

AUTO billing keeps the existing subscription/payment-method path.

## Environment Requirements

Required PayMongo variables:

```env
PAYMONGO_MODE=test
PAYMONGO_SECRET_KEY=...
PAYMONGO_PUBLIC_KEY=...
PAYMONGO_WEBHOOK_SECRET=...
PAYMONGO_API_BASE_URL=https://api.paymongo.com/v1
PAYMONGO_WEBHOOK_TOLERANCE_SECONDS=300
```

## Validation Run

Backend:

```bash
npm run db:generate:local
npm run db:validate:local
npm run typecheck
npm test -- --runInBand
npm run build
```

Results:

- Prisma generate: passed
- Prisma validate: passed
- Typecheck: passed
- Tests: 19 suites passed, 102 tests passed
- Build: passed

Frontend:

```bash
npm run lint
npm run build
```

Results:

- Lint: passed
- Build: blocked by Google Fonts network fetch for `Manrope` and `Sora` in the local environment

## Manual Test Checklist

### Onboarding

1. Register or use an onboarding-incomplete account.
2. Select a plan.
3. Complete company details.
4. Select Manual Payment.
5. Continue to PayMongo hosted checkout.
6. Pay using PayMongo test mode.
7. Confirm webhook receives `checkout_session.payment.paid`.
8. Confirm onboarding draft has `billing_completed_at`.
9. Complete onboarding.

### Additional Company

1. Open workspace company creation.
2. Select Manual Payment.
3. Submit company details.
4. Confirm company is created as provisioning/inactive before payment.
5. Complete PayMongo checkout.
6. Confirm webhook marks payment request `APPLIED`.
7. Confirm company becomes active.

### Renewal

1. Open billing/subscription page.
2. Select Manual Payment.
3. Start checkout.
4. Complete payment in PayMongo test mode.
5. Confirm subscription is active with:
   - `billing_mode = MANUAL`
   - `auto_renew = false`
   - no saved payment method requirement

## Deployment Commands

Shared dev/staging backend:

```bat
cd /d I:\Gr8BooksNeo\apps\backend-shared-dev
git pull origin staging
npm ci
node scripts/run-with-env.cjs .env prisma migrate deploy
node scripts/run-with-env.cjs .env prisma generate
npm run build
pm2 restart gr8booksneo-backend-shared-dev --update-env
pm2 save
```

## Notes

- AUTO billing was not removed or replaced.
- Manual checkout does not store cards.
- Manual checkout does not enable automatic renewal.
- Webhook confirmation is required before access is applied.
- The frontend mock checkout route was removed to avoid confusing test behavior with real PayMongo behavior.
