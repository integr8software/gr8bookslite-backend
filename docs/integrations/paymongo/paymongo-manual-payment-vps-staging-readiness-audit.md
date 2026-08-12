# PayMongo Manual Payment VPS Staging Readiness Audit

> Superseded note: the route mismatch identified in this audit was resolved by
> standardizing the PayMongo webhook controller under `/api/v1`. The current
> staging webhook URL should be
> `https://api.staging.gr8booksneo.integr8.com.ph/api/v1/webhooks/paymongo`.
> See `docs/integrations/paymongo/paymongo-v1-route-standardization.md`.

## Executive Summary

The current manual PayMongo payment implementation is **not fully ready with the webhook URL currently configured in PayMongo**.

The main issue is route alignment:

- PayMongo is configured to call:
  - `https://api.staging.gr8booksneo.integr8.com.ph/api/v1/webhooks/paymongo`
- The current NestJS controller is version-neutral and is exposed as:
  - `https://api.staging.gr8booksneo.integr8.com.ph/api/webhooks/paymongo`

Because the configured PayMongo URL includes `/v1`, PayMongo may be posting to a route that the backend does not actually expose. That would explain why PayMongo marks the payment as paid, but the application remains:

- `billing_payment_attempts.status = AWAITING_PAYMENT`
- `billing_payment_attempts.application_status = PENDING`
- `subscription_invoices.status = OPEN`

The implementation does not require ngrok on VPS staging. The staging backend is already public. The webhook only needs to point to the exact public route that the backend exposes, and the backend must have the correct PayMongo test webhook secret.

---

## Current Architecture

Manual billing flow:

1. Frontend calls BFF/backend proxy:
   - `POST /api/backend/billing/checkout-sessions`
2. Next.js BFF forwards to backend:
   - `POST /api/v1/billing/checkout-sessions`
3. Backend creates:
   - `subscription_invoices`
   - `billing_payment_attempts`
   - PayMongo Checkout Session
4. User pays through PayMongo hosted checkout.
5. PayMongo sends webhook:
   - `checkout_session.payment.paid`
6. Backend should:
   - store/update `billing_webhook_events`
   - mark `billing_payment_attempts.status = PAID`
   - mark `subscription_invoices.status = PAID`
   - apply business state through `BillingPaymentApplicationService`
   - mark `billing_payment_attempts.application_status = APPLIED`

This confirms that `billing_payment_requests` is intentionally obsolete. The current refactor consolidated that responsibility into `billing_payment_attempts`.

---

## 1. Webhook Route Readiness

### Code Evidence

Backend bootstrap:

- `src/main.ts`
  - `NestFactory.create(AppModule, { rawBody: true })`

Global app setup:

- `src/app.setup.ts`
  - `app.setGlobalPrefix('api')`
  - URI versioning is enabled through `VersioningType.URI`

Webhook controller:

- `src/modules/billing/paymongo-webhook.controller.ts`
  - `@Controller({ path: 'webhooks/paymongo', version: VERSION_NEUTRAL })`
  - `@Post()`
  - `@HttpCode(200)`
  - `@Public()`

Generated frontend OpenAPI client also shows:

- `app/src/generated/api/paymongo-webhook/paymongo-webhook.ts`
  - `POST /api/webhooks/paymongo`

### Actual Route

The current route is:

```text
POST /api/webhooks/paymongo
```

not:

```text
POST /api/v1/webhooks/paymongo
```

### Current PayMongo Configuration

Current configured webhook:

```text
https://api.staging.gr8booksneo.integr8.com.ph/api/v1/webhooks/paymongo
```

This does **not** match the version-neutral controller route.

### Public Access

The webhook controller is public:

- It has `@Public()`.
- `JwtAuthGuard` checks the `@Public()` metadata and returns `true`.
- The controller does not use `@UseGuards(JwtAuthGuard)`.
- No frontend BFF or browser session is required.

The only global guard is `ThrottlerGuard` with:

```ts
ttl: 60_000
limit: 300
```

That should not block normal PayMongo webhook delivery volume.

### Readiness Result

Not ready with the currently configured PayMongo URL.

Recommended configuration for the current code:

```text
https://api.staging.gr8booksneo.integr8.com.ph/api/webhooks/paymongo
```

Alternative code change, if the team prefers `/api/v1/webhooks/paymongo`, would be to make the controller versioned with `version: '1'`. That is a code change and should be intentional because it changes the public webhook route.

---

## 2. Raw Request Body Handling

### Code Evidence

`src/main.ts`:

```ts
const app = await NestFactory.create(AppModule, { rawBody: true });
```

`src/modules/billing/paymongo-webhook.controller.ts`:

```ts
@Req() request: Request & { rawBody?: Buffer }
@Headers('paymongo-signature') signatureHeader: string | undefined
```

`src/modules/billing/services/paymongo-webhook.service.ts`:

```ts
handleWebhook(rawBody, signatureHeader)
```

The service converts the raw body to UTF-8 text and verifies the signature against:

```ts
`${timestamp}.${rawPayload}`
```

### Readiness Result

Raw body handling is correctly configured for PayMongo signature verification.

If the request reaches this controller with the correct `Paymongo-Signature` header and the correct `PAYMONGO_WEBHOOK_SECRET`, signature verification should work.

---

## 3. Signature Verification And Environment Mode

### Code Evidence

`PaymongoWebhookService.verifySignature()` chooses the test signature or live signature based on PayMongo payload `livemode`:

```ts
const providedSignature = isLiveMode ? signatureParts.li : signatureParts.te;
```

This is correct for:

```text
PAYMONGO_MODE=test
```

as long as PayMongo sends `livemode = false` and the backend `PAYMONGO_WEBHOOK_SECRET` is the test webhook secret for that configured endpoint.

### Important Risk

`PAYMONGO_WEBHOOK_SECRET` is not validated during application startup. If it is missing or incorrect, the app starts successfully but webhook processing returns an error at request time.

Expected symptoms for wrong secret:

- PayMongo delivery retries.
- `billing_webhook_events` may be empty if the failure happens before event persistence.
- Backend logs show:
  - `Invalid PayMongo webhook signature`
  - or `PAYMONGO_WEBHOOK_SECRET is not configured`

### Readiness Result

Signature logic is correct, but staging readiness depends on verifying that:

```text
PAYMONGO_WEBHOOK_SECRET
```

matches the PayMongo **test mode webhook endpoint secret**, not the API secret key and not a live-mode webhook secret.

---

## 4. Webhook Event Processing

### Supported Manual Events

`PaymongoWebhookService.processEvent()` supports:

```text
checkout_session.payment.paid
checkout_session.payment.failed
checkout_session.expired
checkout_session.payment.expired
checkout_session.payment.cancelled
checkout_session.payment.canceled
```

The required event:

```text
checkout_session.payment.paid
```

is handled.

### Paid Event Flow

For `checkout_session.payment.paid`, the backend:

1. Finds local payment attempt through:
   - `externalCheckoutSessionId = event.resourceId`
   - or metadata:
     - `local_payment_attempt_id`
     - `local_payment_request_id`
2. Updates `subscription_invoices`:
   - `status = PAID`
   - `amount_paid_in_cents = paymentAttempt.amountInCents`
   - `paid_at = now`
3. Updates `billing_payment_attempts`:
   - `status = PAID`
   - `external_payment_intent_id`
   - `external_payment_id`
   - `payment_method_type`
   - `confirmed_at`
4. Calls:
   - `BillingPaymentApplicationService.applyPaidAttempt(paymentAttempt.id)`
5. Marks webhook event:
   - `processing_status = PROCESSED`

### Business Application Flow

`BillingPaymentApplicationService.applyPaidAttempt()`:

- requires attempt status `PAID`
- requires invoice status `PAID`
- validates amount and currency
- activates subscription:
  - `status = ACTIVE`
  - `billing_mode = MANUAL`
  - `auto_renew = false`
  - billing period fields set
- for onboarding:
  - sets `user_onboarding_drafts.billing_completed_at`
  - sets `payment_method_reference`
- marks attempt:
  - `application_status = APPLIED`
  - `applied_at = now`

### Readiness Result

The processing path is implemented correctly for manual PayMongo Checkout Session payments.

The current observed database state indicates the webhook is likely not reaching or not successfully completing this processing path.

---

## 5. Frontend Manual Payment Flow

### Checkout Creation

Frontend service:

- `gr8bookslite-frontend/app/src/services/billing/ManualBillingApi.ts`

creates manual checkout through:

```ts
ApiClient.post('/billing/checkout-sessions', ...)
```

In the browser, `ApiClient` uses:

```text
/api/backend
```

so the request becomes:

```text
POST /api/backend/billing/checkout-sessions
```

The Next.js BFF forwards it to backend using:

- `app/api/backend/[...path]/route.ts`

This is correct for frontend-to-backend communication.

### Success Page Polling

The frontend payment result page:

- `app/billing/payment/[status]/page.tsx`

polls:

```text
GET /api/backend/billing/payment-attempts/:paymentAttemptId
```

and waits for:

```text
applicationStatus = APPLIED
```

For onboarding, it only allows progress to Review after the backend has applied the payment.

### Readiness Result

The frontend behavior is correct. It should continue waiting if the backend has not processed the webhook. The frontend is not the cause of the stuck state.

---

## 6. Database Model Readiness

The current staging database should not contain `billing_payment_requests`. That table is not required.

The current model is:

```text
subscription_invoices
  -> billing_payment_attempts
  -> billing_webhook_events
```

This matches the refactor direction.

Expected state after successful webhook processing:

### billing_payment_attempts

```text
status = PAID
application_status = APPLIED
confirmed_at IS NOT NULL
applied_at IS NOT NULL
external_payment_id IS NOT NULL
```

### subscription_invoices

```text
status = PAID
amount_paid_in_cents = total_amount_in_cents
paid_at IS NOT NULL
```

### billing_webhook_events

```text
event_type = checkout_session.payment.paid
processing_status = PROCESSED
processed_at IS NOT NULL
last_error IS NULL
```

Current observed state:

```text
billing_payment_attempts.status = AWAITING_PAYMENT
billing_payment_attempts.application_status = PENDING
subscription_invoices.status = OPEN
```

This means the webhook handler has not successfully processed the event.

---

## 7. Recommended Staging Checks

### 7.1 Check Actual Route

Run from any machine:

```bash
curl -i https://api.staging.gr8booksneo.integr8.com.ph/api/webhooks/paymongo
```

Expected for `GET`:

```text
404 or method not allowed behavior is acceptable
```

Then compare:

```bash
curl -i https://api.staging.gr8booksneo.integr8.com.ph/api/v1/webhooks/paymongo
```

If `/api/v1/webhooks/paymongo` does not map to the controller, PayMongo must not be configured to use that URL.

For an unsigned `POST`, the correct route should return a controlled `400` from the webhook service, such as missing body/signature:

```bash
curl -i -X POST https://api.staging.gr8booksneo.integr8.com.ph/api/webhooks/paymongo
```

A `400` here is useful. It means the route exists and reached the webhook service.

If the response is `404`, the route is wrong.

### 7.2 Check Webhook Event Table

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

Interpretation:

- No rows: PayMongo is likely not reaching the webhook route, or signature/body validation fails before persistence.
- `FAILED`: route is reached, but processing failed. Check `last_error`.
- `PROCESSED`: webhook succeeded; then inspect payment attempt/application state.

### 7.3 Check Latest Attempt

```sql
SELECT
  id,
  purpose,
  status,
  application_status,
  external_checkout_session_id,
  external_payment_id,
  external_payment_intent_id,
  amount_in_cents,
  currency,
  confirmed_at,
  applied_at,
  application_error,
  created_at
FROM billing_payment_attempts
ORDER BY id DESC
LIMIT 10;
```

### 7.4 Check Latest Invoice

```sql
SELECT
  id,
  company_id,
  company_subscription_id,
  status,
  purpose,
  billing_mode,
  invoice_number,
  total_amount_in_cents,
  amount_paid_in_cents,
  currency,
  paid_at,
  created_at
FROM subscription_invoices
ORDER BY id DESC
LIMIT 10;
```

---

## 8. Why VPS Staging Does Not Need Ngrok

Ngrok is only needed when PayMongo must call a developer machine on localhost.

For VPS staging:

```text
https://api.staging.gr8booksneo.integr8.com.ph
```

is already public and reverse-proxies to the backend on port `3002`.

Therefore, PayMongo can call the staging backend directly as long as:

1. The webhook URL is exact.
2. IIS forwards POST requests to the backend.
3. The backend app has `PAYMONGO_WEBHOOK_SECRET` for the same PayMongo test webhook endpoint.
4. The request body reaches Nest unchanged enough for `rawBody` signature verification.

No ngrok is required.

---

## 9. Root Cause Hypothesis For Current Issue

Most likely root cause:

```text
PayMongo webhook URL is configured as /api/v1/webhooks/paymongo,
but the backend exposes /api/webhooks/paymongo.
```

This would produce repeated PayMongo retries and leave local records unchanged.

Secondary possible causes to check after fixing route:

1. Wrong `PAYMONGO_WEBHOOK_SECRET`
2. IIS/proxy altering request body before it reaches Nest
3. PayMongo sends an event shape different from the assumed checkout-session payload
4. Business application fails after payment confirmation due to amount/currency mismatch or missing local records

The database state will distinguish these:

- No `billing_webhook_events`: route/signature/body issue before persistence.
- `billing_webhook_events.FAILED`: route reached, processing error recorded in `last_error`.
- Attempt `PAID` but application `FAILED`: payment confirmed, business application failed; inspect `application_error`.

---

## 10. Readiness Decision

Current readiness status:

```text
Not ready with the currently configured PayMongo webhook URL.
```

The code is mostly ready for VPS staging, but the PayMongo webhook endpoint must match the deployed Nest route.

Recommended immediate staging configuration:

```text
https://api.staging.gr8booksneo.integr8.com.ph/api/webhooks/paymongo
```

not:

```text
https://api.staging.gr8booksneo.integr8.com.ph/api/v1/webhooks/paymongo
```

After updating PayMongo, send a new test payment. Do not rely on old failed retries because they may be retrying against the old URL configuration.

---

## 11. Minimal Fix Options

### Option A: Configuration-only fix

Update PayMongo test webhook URL to:

```text
https://api.staging.gr8booksneo.integr8.com.ph/api/webhooks/paymongo
```

Pros:

- No code change.
- Matches current generated API route.
- Fastest staging fix.

Cons:

- Webhook endpoint is version-neutral while most backend API endpoints are versioned.

### Option B: Code route fix

Change webhook controller from:

```ts
version: VERSION_NEUTRAL
```

to:

```ts
version: '1'
```

Then PayMongo URL remains:

```text
https://api.staging.gr8booksneo.integr8.com.ph/api/v1/webhooks/paymongo
```

Pros:

- Consistent with `/api/v1` backend routes.

Cons:

- Requires code change and redeploy.
- Existing webhook configs using `/api/webhooks/paymongo` would need updating.

Recommended for immediate staging:

```text
Option A
```

Recommended long-term:

Decide whether external webhooks should be version-neutral or versioned. Either is acceptable, but the deployed code, documentation, and PayMongo dashboard must match exactly.

---

## 12. Validation Plan

After updating the webhook URL or route:

1. Deploy backend.
2. Confirm route:

```bash
curl -i -X POST https://api.staging.gr8booksneo.integr8.com.ph/api/webhooks/paymongo
```

Expected:

```text
400 Bad Request
Missing webhook body or Paymongo-Signature header.
```

3. Confirm PayMongo test webhook endpoint uses the same route.
4. Perform a new manual checkout payment.
5. Confirm PayMongo delivery response is `2xx`.
6. Confirm database:

```text
billing_webhook_events.processing_status = PROCESSED
billing_payment_attempts.status = PAID
billing_payment_attempts.application_status = APPLIED
subscription_invoices.status = PAID
```

7. Confirm frontend payment result page unlocks Continue.
8. Confirm onboarding continues to Review.

---

## Final Recommendation

The implementation does not need ngrok for VPS staging.

The current blocker is webhook endpoint mismatch. Configure PayMongo test webhook to:

```text
https://api.staging.gr8booksneo.integr8.com.ph/api/webhooks/paymongo
```

or intentionally change the backend controller to expose `/api/v1/webhooks/paymongo`.

Until this is corrected, PayMongo can mark payments as paid in its own dashboard while Gr8Books Neo remains pending because the backend does not process the webhook event.
