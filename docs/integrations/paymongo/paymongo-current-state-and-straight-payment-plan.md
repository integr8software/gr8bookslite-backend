# PayMongo Current State and Straight Payment Plan

## Purpose

This document records the current Gr8Books Neo PayMongo implementation and the recommended plan for adding hybrid billing:

- `AUTO`: subscription/recurring billing through PayMongo subscriptions.
- `MANUAL`: straight one-time payment through PayMongo hosted/manual payment flow.

The straight payment flow should support available PayMongo methods such as GCash, Maya, QRPh, card, BPI Direct Debit, and UBP Direct Debit without saving cards and without automatic deduction.

No code is implemented by this document.

---

## 1. Current PayMongo Implementation

### Backend Billing Module

Current billing code lives mainly in:

- `src/modules/billing/billing.module.ts`
- `src/modules/billing/billing.controller.ts`
- `src/modules/billing/billing.service.ts`
- `src/modules/billing/paymongo-webhook.controller.ts`
- `src/modules/billing/services/paymongo.service.ts`
- `src/modules/billing/services/paymongo-webhook.service.ts`
- `src/modules/billing/mappers/*`
- `src/modules/billing/utils/*`
- `src/modules/onboarding/onboarding.service.ts`
- `src/modules/workspace/companies/workspace-companies.service.ts`

`BillingModule` registers:

- `BillingController`
- `PaymongoWebhookController`
- `BillingService`
- `PaymongoService`
- `PaymongoWebhookService`

### Current Backend API Endpoints

Authenticated billing endpoints:

| Endpoint | Purpose |
|---|---|
| `GET /api/v1/billing/plans?scope=...` | Lists active local subscription plans. |
| `GET /api/v1/billing/payment-methods` | Lists locally stored payment method references for the user. |
| `GET /api/v1/billing/subscription-setup?scope=...` | Returns plans plus current company subscription. |
| `GET /api/v1/billing/subscriptions/current` | Returns latest company subscription. |
| `POST /api/v1/billing/subscriptions` | Creates or reuses a company subscription setup. |
| `POST /api/v1/billing/subscriptions/:subscriptionId/attach-payment-method` | Attaches a PayMongo payment method to the latest subscription payment intent. |
| `POST /api/v1/billing/subscriptions/:subscriptionId/cancel` | Requests subscription cancellation. |

Public webhook endpoint:

| Endpoint | Purpose |
|---|---|
| `POST /api/v1/webhooks/paymongo` | Receives PayMongo webhook events and updates local billing state. |

### Current PayMongo Environment Variables

Backend examples define:

```env
PAYMONGO_MODE=test
PAYMONGO_SECRET_KEY=""
PAYMONGO_PUBLIC_KEY=""
PAYMONGO_WEBHOOK_SECRET=""
PAYMONGO_API_BASE_URL="https://api.paymongo.com/v1"
PAYMONGO_WEBHOOK_TOLERANCE_SECONDS=300
```

Frontend examples define:

```env
NEXT_PUBLIC_PAYMONGO_PUBLIC_KEY=
NEXT_PUBLIC_PAYMONGO_API_BASE_URL=https://api.paymongo.com/v1
```

### PayMongo Service Capabilities Today

`PaymongoService` currently supports:

- `createCustomer`
- `retrieveCustomerByEmail`
- `createPlan`
- `createSubscription`
- `retrieveSubscription`
- `cancelSubscription`
- `attachPaymentIntent`

It does not currently support:

- Checkout Session creation.
- Manual one-time Payment Intent creation.
- Source creation for e-wallet/direct debit flows.
- Payment link/session status retrieval.
- Manual payment request expiration/cancellation.

### Current Payment Creation Flow

The current frontend directly creates a PayMongo card payment method:

- File: `gr8bookslite-frontend/app/src/services/billing/PaymongoClient.ts`
- PayMongo endpoint: `POST /payment_methods`
- Auth: frontend public key through `NEXT_PUBLIC_PAYMONGO_PUBLIC_KEY`
- Type: hardcoded `card`

The frontend then sends the resulting `pm_...` id to the backend.

Backend then attaches that payment method to the subscription latest payment intent:

- `BillingService.attachPaymentMethodForCompany`
- `PaymongoService.attachPaymentIntent`
- PayMongo endpoint: `POST /payment_intents/:id/attach`

If PayMongo returns a redirect URL, the frontend redirects the user for card authentication.

This is not a straight payment flow. It is a card payment method setup plus subscription payment intent confirmation flow.

### Current Subscription Creation Flow

`BillingService.prepareCompanySubscription` is the main subscription setup method.

Current flow:

1. Validate company.
2. Validate active `SubscriptionPlan` by `planCode`.
3. Validate active `SubscriptionPlanPrice` by `billingCycle`.
4. Check latest `CompanySubscription`.
5. Reuse an existing matching `INCOMPLETE` subscription if present.
6. Ensure a local/remote PayMongo customer.
7. Ensure the plan price has an external PayMongo plan id.
8. Create PayMongo subscription through `/subscriptions`.
9. Store local `company_subscriptions` row.
10. Store latest invoice/payment intent details if provided.
11. Return subscription and payment setup references.

PayMongo metadata currently includes:

```ts
{
  company_id: companyId,
  local_plan_code: plan.code,
  local_plan_price_id: planPrice.id,
  local_billing_cycle: input.billingCycle
}
```

### AUTO Billing Provider Requirement

AUTO billing uses the real PayMongo subscription flow only. The backend must create a real PayMongo customer, plan, subscription, and payment intent/payment method setup before storing a successful AUTO billing setup.

If PayMongo customer, plan, subscription, or payment setup fails, return the billing error from that step. Do not create local placeholder customers, fake subscription references, or local pending provider-activation records.

Legitimate PayMongo subscription states such as `INCOMPLETE`, `PAST_DUE`, and `UNPAID` remain valid when they come from a real PayMongo subscription.

### Webhook Handling

`PaymongoWebhookController` receives `POST /api/v1/webhooks/paymongo`.

`PaymongoWebhookService`:

- Requires raw body and `paymongo-signature`.
- Verifies HMAC SHA-256 signature with `PAYMONGO_WEBHOOK_SECRET`.
- Enforces timestamp tolerance through `PAYMONGO_WEBHOOK_TOLERANCE_SECONDS`.
- Stores events in `billing_webhook_events`.
- Uses `(billingProvider, eventId)` as an idempotency key.
- Marks events as `PENDING`, `PROCESSED`, or `FAILED`.

Handled event types today:

| Event | Current behavior |
|---|---|
| `subscription.activated` | Updates local subscription state. |
| `subscription.updated` | Updates local subscription state. |
| `subscription.past_due` | Updates local subscription state. |
| `subscription.unpaid` | Updates local subscription state. |
| `subscription.invoice.created` | Upserts local invoice. |
| `subscription.invoice.finalized` | Upserts local invoice. |
| `subscription.invoice.paid` | Upserts local invoice. |
| `subscription.invoice.payment_failed` | Upserts local invoice. |
| `payment.paid` | Finds subscription by payment intent or subscription id and marks it `ACTIVE`. |
| `payment.failed` | Finds subscription and marks it `PAST_DUE` or leaves it `UNPAID`. |

Unhandled webhook event types are logged and marked processed.

### Success, Cancel, and Failure Handling

Success:

- `payment.paid` sets matching `CompanySubscription.status = ACTIVE`.
- `subscription.activated` also maps provider status into local subscription status.
- `subscription.invoice.paid` stores invoice payment details.

Failure:

- `payment.failed` updates subscription status to `PAST_DUE` or `UNPAID`.
- Failure code/message are copied from provider attributes when available.
- `subscription.invoice.payment_failed` records invoice failure state.

Cancel:

- `POST /api/v1/billing/subscriptions/:subscriptionId/cancel` calls PayMongo cancel if `externalSubscriptionId` exists.
- Local status is only set to `CANCELED` immediately when there is no external subscription id.
- Response warns that final local status should still be confirmed by webhook updates.

### Database Models Related to Billing

Current billing and subscription models:

- `SubscriptionPlan`
- `SubscriptionPlanPrice`
- `SubscriptionPlanUsageRule`
- `SubscriptionPlanDiscountTier`
- `SubscriptionPlanModule`
- `SubscriptionPlanSystem`
- `CompanySubscription`
- `BillingCustomer`
- `SubscriptionInvoice`
- `BillingPaymentMethod`
- `BillingWebhookEvent`
- `UserOnboardingDraft`

Important current shape:

- `SubscriptionPlan` stores local SaaS plan definitions.
- `SubscriptionPlanPrice` stores price per billing cycle and optional `externalPlanId`.
- `CompanySubscription` stores company subscription state and provider references.
- `SubscriptionInvoice` stores provider invoice/payment-intent details for subscriptions.
- `BillingPaymentMethod` stores saved payment method references.
- `BillingWebhookEvent` stores webhook idempotency and processing status.
- `UserOnboardingDraft` stores pre-company onboarding state and billing setup fields.

Missing for manual straight payment:

- No billing payment request table.
- No checkout session table.
- No one-time payment transaction table.
- No explicit `billingMode`.
- No explicit `autoRenew`.
- No clean model for a payment that is not a saved payment method and not a subscription invoice.

### Frontend PayMongo/Billing Code

Current frontend billing files include:

- `app/src/services/billing/PaymongoClient.ts`
- `app/src/services/billing/BillingApi.ts`
- `app/src/data/billing/BillingTypes.ts`
- `app/src/hooks/billing/useBillingSubscriptionManager.ts`
- `app/src/hooks/billing/useBillingSubscriptionSetupQuery.ts`
- `app/src/hooks/onboarding/useOnboardingSubmission.ts`
- `app/src/services/onboarding/OnboardingApi.ts`
- `app/src/services/onboarding/OnboardingApiTypes.ts`
- `app/workspace/billing-and-subscription/page.tsx`

Current frontend billing behavior:

- Creates card payment method directly with PayMongo public key.
- Sends `paymentMethodId` to backend.
- Redirects to PayMongo authentication URL only when backend returns `paymentIntent.redirectUrl`.
- Does not currently create a hosted checkout session.
- Does not support GCash, Maya, QRPh, BPI Direct Debit, or UBP Direct Debit in the billing UI.

---

## 2. Current User Flows

### A. Onboarding Plan Payment

Current flow:

1. User selects a plan in onboarding.
2. Frontend calls:

```ts
POST /api/v1/onboarding/plan
```

3. Backend stores selected `subscriptionPlanId` and `billingCycle` in `user_onboarding_drafts`.
4. User completes company details.
5. Backend creates or updates a `Company` in `PROVISIONING` state.
6. Backend creates or updates head office unit and company-owned defaults.
7. User enters card details.
8. Frontend creates a PayMongo card payment method directly:

```ts
POST https://api.paymongo.com/v1/payment_methods
```

9. Frontend calls:

```ts
POST /api/v1/onboarding/billing
```

with card metadata and `paymentMethodId`.

10. Backend calls `BillingService.prepareCompanySubscription`.
11. Backend creates/reuses PayMongo customer, PayMongo plan, PayMongo subscription, and local `CompanySubscription`.
12. Backend attaches the card payment method to the subscription latest payment intent.
13. If a redirect URL is returned, frontend redirects the user to complete authentication.
14. Backend marks draft billing completed.
15. On final onboarding step, frontend calls:

```ts
POST /api/v1/onboarding/complete
```

16. Backend validates that a matching subscription exists in one of:

```ts
INCOMPLETE, TRIALING, ACTIVE, PAST_DUE, UNPAID
```

17. Backend activates the company and creates/activates admin membership.

Current risk:

- Onboarding completion accepts an `INCOMPLETE` subscription if billing setup exists.
- This was useful for provider fallback but should be made explicit when introducing manual payment states.

### B. Additional Company Usage Payment

Current flow starts from workspace company creation:

- Backend file: `src/modules/workspace/companies/workspace-companies.service.ts`
- DTO: `CreateWorkspaceCompanyBillingDto`

Current flow:

1. User creates an additional company from workspace.
2. Request may include:

```ts
billing: {
  planCode,
  billingCycle,
  billingEmail,
  paymentMethodId,
  cardBrand,
  cardLast4,
  cardExpiryMonth,
  cardExpiryYear
}
```

3. Backend creates company and company defaults.
4. Backend calls `setupCompanyBilling`.
5. `setupCompanyBilling` calls `BillingService.prepareCompanySubscription`.
6. If no `paymentMethodId` is provided, backend returns subscription setup only.
7. If `paymentMethodId` is provided:
   - For provider fallback, backend records pending payment setup.
   - Otherwise backend attaches the payment method to the PayMongo subscription payment intent.
8. If billing setup fails, the backend attempts to clean up the provisioned company.

Current frontend workspace billing page uses the subscription setup flow and card payment method creation.

Observed issue:

- `useBillingSubscriptionManager` currently hardcodes plan scope as `ONBOARDING`.
- Additional company billing should use `ADDITIONAL_COMPANY` where appropriate.

### C. Subscription/Recurring Payment

Implemented:

- Local subscription plans and prices.
- PayMongo customer creation/reuse.
- PayMongo subscription plan creation.
- PayMongo subscription creation.
- Card payment method creation on frontend.
- Payment method attach to latest subscription payment intent.
- Webhook processing for subscription, invoice, and payment events.
- Local subscription status updates from webhook.
- Provider activation fallback for accounts where PayMongo subscription billing is not enabled.

Incomplete or missing:

- Hosted checkout/manual payment flow.
- Non-card payment method UI.
- Manual renewal flow.
- One-time payment request tracking.
- `billingMode` and `autoRenew` fields.
- Explicit manual payment lifecycle.
- Provider-neutral payment transaction ledger.
- Full support for PayMongo methods that do not use saved card payment methods.

PayMongo account dependency:

- The recurring flow depends on PayMongo subscriptions being enabled/configured for the account.
- Current fallback exists because subscription billing may not be activated in the PayMongo account.

---

## 3. Gap Analysis for Straight Payment

### Expected Manual Straight Payment Flow

Target flow:

```text
User clicks Subscribe/Renew/Add Company
-> Backend creates PayMongo Checkout Session or Payment Intent
-> User pays with GCash/Maya/QRPh/Card/BPI/UBP
-> PayMongo webhook confirms payment
-> System activates or extends subscription
-> No saved card
-> No auto deduction
```

### Existing Code That Can Be Reused

Reusable:

- `SubscriptionPlan` and `SubscriptionPlanPrice`.
- `CompanySubscription` for the final subscription state.
- `BillingCustomer` if PayMongo checkout/manual payment needs customer context.
- `BillingWebhookEvent` idempotent webhook processing pattern.
- PayMongo signature verification.
- Provider payload utility helpers.
- Plan/price validation in `BillingService`.
- Onboarding company provisioning flow.
- Workspace additional company provisioning flow.
- Subscription status mapping utilities where applicable.

Reusable with caution:

- `CompanySubscription.latestPaymentIntentId` can store a manual payment intent temporarily, but a dedicated payment request table is cleaner.
- `SubscriptionInvoice` is subscription-invoice-specific and should not be stretched too far for one-time payments.
- `BillingPaymentMethod` should not be used for manual straight payments unless the user intentionally chooses an auto-renew saved method.

Not reusable for manual straight payment:

- Frontend `CreatePaymongoCardPaymentMethod` flow.
- `attachPaymentMethodForCompany`.
- Subscription-provider fallback as a substitute for checkout/manual payments.

### Endpoint Needed

Add a backend-owned manual payment endpoint instead of creating PayMongo objects directly in the browser.

Recommended endpoint:

```http
POST /api/v1/billing/checkout-sessions
```

Suggested request:

```ts
{
  purpose: "ONBOARDING" | "RENEWAL" | "ADDITIONAL_COMPANY";
  planCode: string;
  billingCycle: "MONTHLY" | "YEARLY";
  companyId?: number;
  onboardingDraftId?: number;
  successUrl: string;
  cancelUrl: string;
  billingMode: "MANUAL";
}
```

Suggested response:

```ts
{
  paymentRequestId: number;
  checkoutSessionId: string;
  checkoutUrl: string;
}
```

Optional status endpoint:

```http
GET /api/v1/billing/payment-requests/:paymentRequestId
```

### Checkout Session vs Payment Intent

Recommended first choice: PayMongo Checkout Session.

Reason:

- Hosted checkout is better for manual straight payment.
- It keeps the application out of card/e-wallet/direct debit collection details.
- It is a better fit for GCash, Maya, QRPh, card, and direct debit methods.
- It avoids saving cards by default.
- It reduces frontend complexity.

Payment Intent is still useful if:

- Checkout Session cannot support one of the required payment methods in the account.
- A future custom payment UI is required.
- PayMongo requires method-specific attachment/source flows for a specific channel.

Before implementation, confirm the exact supported PayMongo object and webhook event names for the active account. The current codebase does not contain checkout-session support.

### Metadata Required on PayMongo Payment

Attach enough metadata to identify the payment without trusting frontend state:

```ts
{
  billing_mode: "MANUAL",
  payment_purpose: "ONBOARDING" | "RENEWAL" | "ADDITIONAL_COMPANY",
  environment: "local" | "shared-dev" | "staging" | "production",
  company_id: number,
  owner_user_id: number,
  subscription_plan_id: number,
  subscription_plan_code: string,
  subscription_plan_price_id: number,
  billing_cycle: "MONTHLY" | "YEARLY",
  company_subscription_id?: number,
  onboarding_draft_id?: number,
  provisioned_company_id?: number,
  local_payment_request_id: number,
  idempotency_key: string
}
```

### How To Identify Payment Purpose

Use an explicit local payment request record.

Recommended new table concept:

```text
billing_payment_requests
```

Suggested fields:

- `id`
- `company_id`
- `owner_user_id`
- `company_subscription_id`
- `subscription_plan_id`
- `subscription_plan_price_id`
- `purpose`
- `billing_mode`
- `status`
- `billing_provider`
- `external_checkout_session_id`
- `external_payment_intent_id`
- `external_payment_id`
- `amount_in_cents`
- `currency`
- `success_url`
- `cancel_url`
- `metadata`
- `raw_provider_payload`
- `paid_at`
- `failed_at`
- `expired_at`
- `created_at`
- `updated_at`

This table should be the source of truth for pending manual payments.

Do not overload `BillingPaymentMethod` for this purpose. Manual payment does not mean a saved payment method exists.

### Safe Subscription/Company Update After Webhook

Webhook success should:

1. Verify webhook signature.
2. Find local `BillingWebhookEvent` and enforce idempotency.
3. Find `billing_payment_requests` by provider session/payment id or metadata id.
4. Verify:
   - expected amount
   - expected currency
   - expected plan price
   - expected company
   - status is still payable
5. In a transaction:
   - mark payment request `PAID`
   - activate or extend `CompanySubscription`
   - update provider references
   - activate `PROVISIONING` company if the payment purpose allows it
   - mark onboarding billing completed if this is onboarding
6. Ignore duplicate success webhooks after the first processed success.

Webhook failure/cancel/expire should:

- mark payment request failed/canceled/expired
- keep company in `PROVISIONING` for onboarding/additional company if not paid
- not grant paid access
- not delete company automatically inside webhook

---

## 4. Recommended Hybrid Billing Design

### Billing Modes

Add explicit billing mode semantics:

```ts
billingMode = "MANUAL" | "AUTO";
autoRenew = true | false;
```

Recommended meaning:

| Mode | Meaning |
|---|---|
| `AUTO` | Recurring subscription. Requires provider subscription and saved/default payment method. |
| `MANUAL` | Straight one-time payment. No saved card. No auto deduction. User renews manually. |

Recommended valid combinations:

| billingMode | autoRenew | Use case |
|---|---:|---|
| `AUTO` | `true` | Current recurring subscription flow. |
| `MANUAL` | `false` | New straight/manual payment flow. |

Avoid allowing:

| billingMode | autoRenew | Reason |
|---|---:|---|
| `AUTO` | `false` | Ambiguous. If no auto-renew, use `MANUAL`. |
| `MANUAL` | `true` | Contradicts no auto-deduction requirement. |

### AUTO Flow

Keep current subscription flow:

```text
Company
-> BillingCustomer
-> PayMongo Customer
-> PayMongo Subscription Plan
-> PayMongo Subscription
-> PayMongo Payment Intent
-> Saved Payment Method
-> Webhook activates subscription
```

This should remain available for future recurring subscriptions.

### MANUAL Flow

New flow:

```text
Company or onboarding draft
-> BillingPaymentRequest
-> PayMongo Checkout Session
-> User pays with available payment method
-> Webhook marks payment request paid
-> CompanySubscription becomes active/extended
-> No BillingPaymentMethod row required
```

### Onboarding With Manual Payment

Recommended flow:

1. User selects plan.
2. User completes company details.
3. Backend creates company in `PROVISIONING`.
4. User clicks pay.
5. Backend creates local payment request and PayMongo Checkout Session.
6. User pays on PayMongo hosted page.
7. Webhook marks payment request paid.
8. Backend marks onboarding billing completed.
9. User can complete onboarding.
10. Company becomes active.

Decision to make before implementation:

- Either webhook activates the company immediately after successful payment.
- Or webhook only marks billing complete and the user still confirms the final onboarding review step.

The second option is safer because onboarding still has a clear final confirmation step.

### Additional Company With Manual Payment

Recommended flow:

1. User enters company details and selected plan.
2. Backend creates company in `PROVISIONING`.
3. Backend creates local payment request and checkout session.
4. User pays.
5. Webhook marks payment paid.
6. Backend activates company and subscription.
7. User can switch into the new company.

If payment expires/fails:

- Keep company in `PROVISIONING`.
- Allow retry payment.
- Do not grant access.

### Renewal With Manual Payment

Recommended flow:

1. Admin clicks Renew.
2. Backend creates payment request for current or selected plan.
3. User pays through hosted checkout.
4. Webhook marks paid.
5. Backend extends subscription period.

Current `CompanySubscription` has:

- `startsAt`
- `trialEndsAt`
- `currentPeriodStartAt`
- `nextBillingAt`
- `endsAt`

For manual renewals, `nextBillingAt` can represent the next renewal due date, but a dedicated `currentPeriodEndAt` would be clearer in a future schema cleanup.

### Frontend Design

For `MANUAL`:

- Frontend should not collect card details.
- Frontend should not call PayMongo `/payment_methods`.
- Frontend should call backend to create a checkout session.
- Backend returns hosted checkout URL.
- Frontend redirects user to PayMongo.
- Frontend shows pending/paid/failed state by querying backend after redirect.

For `AUTO`:

- Existing card payment method flow can remain.
- If PayMongo supports hosted subscription setup later, this can also be moved behind backend-owned checkout/setup sessions.

### API Shape Recommendation

Option A: Add separate manual endpoint.

```http
POST /api/v1/billing/checkout-sessions
```

Pros:

- Clear separation from current subscription endpoint.
- Minimal risk to current recurring flow.
- Easy to test manually.

Option B: Extend `POST /api/v1/billing/subscriptions`.

```ts
{
  planCode: string;
  billingCycle: BillingCycle;
  billingMode: "MANUAL" | "AUTO";
}
```

Pros:

- Single entry point.

Cons:

- More branching inside existing subscription code.
- Higher risk of mixing manual and auto semantics.

Recommended: Option A first, then unify later only if the flows stabilize.

### Backend Service Design

Keep responsibilities separated:

- `BillingService`
  - plan validation
  - subscription state transitions
  - shared billing orchestration
- `PaymongoService`
  - PayMongo API calls only
- `PaymongoWebhookService`
  - webhook verification and event dispatch
- New manual payment service, for example `BillingPaymentRequestService`
  - create manual payment request
  - create checkout session through `PaymongoService`
  - handle successful/failed/expired payment request updates

Avoid putting checkout-session logic directly in onboarding or workspace company services.

### Webhook Design

Extend webhook handling to support manual payment events.

Webhook processing should route by:

- event type
- provider object id
- metadata `local_payment_request_id`
- payment purpose

Do not activate subscriptions only from provider amount/status without checking local payment request state.

### State Model Recommendation

Suggested manual payment request statuses:

```ts
PENDING
AWAITING_PAYMENT
PAID
FAILED
CANCELED
EXPIRED
APPLIED
```

Suggested subscription mode fields:

```ts
billingMode: "MANUAL" | "AUTO";
autoRenew: boolean;
```

For backward compatibility:

- Existing subscriptions can default to `AUTO` if they have external subscription/payment method state.
- New manual payments should create subscriptions with `MANUAL` and `autoRenew = false`.

---

## 5. Key Architecture Decisions

### Keep Subscription Plans as Source of Truth

Manual payments should still purchase a `SubscriptionPlanPrice`.

Do not create separate manual-only pricing tables unless pricing requirements diverge later.

### Do Not Save Payment Methods for Manual Payments

Manual straight payment must not create `BillingPaymentMethod` rows by default.

`BillingPaymentMethod` should remain for saved/default payment method references used by recurring billing.

### Use Hosted Checkout for Manual Payment

Hosted checkout keeps Gr8Books Neo out of payment method collection.

This is cleaner for:

- GCash
- Maya
- QRPh
- Card
- BPI Direct Debit
- UBP Direct Debit

### Keep Webhook Idempotency

Current `BillingWebhookEvent` is a good pattern and should be reused.

Manual payment processing must be safe if PayMongo sends the same event more than once.

### Do Not Treat Redirect Success as Payment Success

Frontend success redirect only means the user returned from PayMongo.

Only webhook confirmation, or backend verification against PayMongo, should activate or extend subscription access.

---

## 6. Proposed Implementation Phases

### Phase 1: Data Model and Backend Manual Payment Core

- Add `billingMode` and `autoRenew` semantics.
- Add `billing_payment_requests` or equivalent table.
- Add PayMongo checkout session methods.
- Add manual checkout creation endpoint.
- Add webhook handling for manual payment success/failure/expiration.

### Phase 2: Onboarding Manual Payment

- Replace card form with manual payment option.
- Create checkout session from onboarding billing step.
- Mark onboarding billing complete after webhook success.
- Keep final onboarding completion explicit.

### Phase 3: Additional Company Manual Payment

- Use the same manual payment request service.
- Keep company in `PROVISIONING` until payment is confirmed.
- Activate company/subscription only after payment success.

### Phase 4: Renewal

- Add renewal payment request creation.
- Extend subscription period after payment success.
- Add payment history/status UI.

### Phase 5: AUTO Mode Cleanup

- Keep current recurring flow.
- Consider moving recurring setup behind backend-owned setup sessions if PayMongo supports a cleaner hosted flow.

---

## 7. Open Questions Before Implementation

1. Which PayMongo hosted object should be used for all target methods in the active account: Checkout Session, Payment Intent, Source, or a combination?
2. What exact webhook event types will be emitted for hosted checkout success, failure, expiration, and payment completion?
3. Should onboarding company activation happen immediately after payment success, or only after the user clicks final onboarding completion?
4. Should manual renewal extend `nextBillingAt`, add `currentPeriodEndAt`, or create a new subscription row per term?
5. Should existing subscriptions default to `AUTO`, or should fallback/incomplete local subscriptions be classified separately?
6. Should additional company plans use `ADDITIONAL_COMPANY` scope consistently in the frontend billing UI?
7. Should the public key direct card payment method flow remain visible after manual checkout is introduced?

---

## 8. Summary

Current implementation is subscription-first and card-first.

It already has:

- PayMongo customer support.
- PayMongo subscription support.
- Local subscription records.
- Invoice records.
- Saved payment method records.
- Webhook verification and idempotency.
- Fallback for PayMongo subscription activation issues.

It does not yet have:

- Straight/manual one-time payment.
- Hosted checkout.
- Non-card billing methods.
- Manual payment request tracking.
- Explicit `MANUAL` vs `AUTO` subscription mode.

Recommended direction:

```text
AUTO:
CompanySubscription -> PayMongo Subscription -> Saved Payment Method -> Auto renew

MANUAL:
BillingPaymentRequest -> PayMongo Checkout Session -> Webhook success -> Activate/extend subscription
```

This keeps recurring billing available while adding straight payment without saved cards or auto deduction.
