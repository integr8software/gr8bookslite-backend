# PayMongo `/api/v1` Route Standardization

## Overview

PayMongo-related backend routes now consistently use the versioned API prefix:

```text
/api/v1
```

The PayMongo webhook endpoint is now:

```text
POST /api/v1/webhooks/paymongo
```

For staging, configure the PayMongo test webhook URL as:

```text
https://api.staging.gr8booksneo.integr8.com.ph/api/v1/webhooks/paymongo
```

This aligns the webhook route with the existing billing routes:

```text
POST /api/v1/billing/checkout-sessions
GET  /api/v1/billing/payment-attempts/:paymentAttemptId
POST /api/v1/billing/subscriptions
POST /api/v1/billing/subscriptions/:subscriptionId/attach-payment-method
```

## Root Cause

The PayMongo webhook controller previously used:

```ts
version: VERSION_NEUTRAL
```

With the backend global prefix set to `api`, that exposed:

```text
POST /api/webhooks/paymongo
```

Most other billing endpoints already used URI API versioning and were exposed under:

```text
/api/v1
```

This mismatch caused staging confusion because the PayMongo dashboard was configured with:

```text
https://api.staging.gr8booksneo.integr8.com.ph/api/v1/webhooks/paymongo
```

while the backend was listening on the unversioned webhook path.

## Implementation

Updated:

```text
src/modules/billing/paymongo-webhook.controller.ts
```

From:

```ts
@Controller({
  path: 'webhooks/paymongo',
  version: VERSION_NEUTRAL,
})
```

To:

```ts
@Controller({
  path: 'webhooks/paymongo',
  version: '1',
})
```

No changes were made to the webhook processing logic.

The webhook remains:

- public through `@Public()`
- raw-body based for signature verification
- idempotent through `billing_webhook_events`
- responsible for processing `checkout_session.payment.paid`

## Files Changed

Backend:

```text
src/modules/billing/paymongo-webhook.controller.ts
docs/paymongo-current-state-and-straight-payment-plan.md
docs/agents/billing.agent.md
docs/paymongo-manual-payment-vps-staging-readiness-audit.md
docs/paymongo-v1-route-standardization.md
```

Frontend generated API reference:

```text
app/src/generated/api/paymongo-webhook/paymongo-webhook.ts
```

The generated frontend webhook client is not used by the runtime PayMongo webhook flow, because PayMongo calls the backend directly. It was updated only so generated route references remain consistent.

## Staging Configuration

PayMongo test webhook endpoint should be:

```text
https://api.staging.gr8booksneo.integr8.com.ph/api/v1/webhooks/paymongo
```

Enabled event:

```text
checkout_session.payment.paid
```

Backend environment:

```env
PAYMONGO_MODE=test
PAYMONGO_SECRET_KEY=...
PAYMONGO_WEBHOOK_SECRET=...
PAYMONGO_API_BASE_URL=https://api.paymongo.com/v1
APP_ENV=staging
NODE_ENV=production
```

Important:

`PAYMONGO_WEBHOOK_SECRET` must be the webhook signing secret for the same PayMongo test webhook endpoint.

## Validation Checklist

After deployment:

1. Confirm unsigned requests reach the controller:

```bash
curl -i -X POST https://api.staging.gr8booksneo.integr8.com.ph/api/v1/webhooks/paymongo
```

Expected:

```text
400 Bad Request
```

This is expected because the request has no raw PayMongo payload or signature. It confirms the route exists.

2. Run a new PayMongo test manual checkout.

3. In PayMongo dashboard, confirm webhook delivery returns `2xx`.

4. Confirm database state:

```sql
SELECT
  id,
  event_id,
  event_type,
  processing_status,
  processing_attempts,
  processed_at,
  last_error,
  created_at
FROM billing_webhook_events
ORDER BY id DESC
LIMIT 20;
```

Expected:

```text
event_type = checkout_session.payment.paid
processing_status = PROCESSED
last_error = NULL
```

5. Confirm payment attempt:

```sql
SELECT
  id,
  purpose,
  status,
  application_status,
  external_checkout_session_id,
  external_payment_id,
  external_payment_intent_id,
  confirmed_at,
  applied_at,
  application_error
FROM billing_payment_attempts
ORDER BY id DESC
LIMIT 10;
```

Expected:

```text
status = PAID
application_status = APPLIED
confirmed_at IS NOT NULL
applied_at IS NOT NULL
application_error IS NULL
```

6. Confirm invoice:

```sql
SELECT
  id,
  status,
  amount_due_in_cents,
  amount_paid_in_cents,
  paid_at
FROM subscription_invoices
ORDER BY id DESC
LIMIT 10;
```

Expected:

```text
status = PAID
amount_paid_in_cents = amount_due_in_cents
paid_at IS NOT NULL
```

## Deployment Notes

This change does not require ngrok for VPS staging.

The VPS staging backend is already public through:

```text
https://api.staging.gr8booksneo.integr8.com.ph
```

PayMongo can call the backend directly as long as the webhook URL is configured exactly as:

```text
https://api.staging.gr8booksneo.integr8.com.ph/api/v1/webhooks/paymongo
```

## Risk

Any old PayMongo webhook endpoint configured as:

```text
https://api.staging.gr8booksneo.integr8.com.ph/api/webhooks/paymongo
```

must be updated to the versioned route.

The automatic subscription flow and manual checkout creation flow are unchanged.
