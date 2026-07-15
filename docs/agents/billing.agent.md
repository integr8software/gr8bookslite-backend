# Billing Agent

This document defines the backend implementation guide for PayMongo subscription billing.

## Scope

This agent covers:

- PayMongo plan setup
- customer creation
- subscription creation
- first payment setup
- invoice and payment intent tracking
- webhook verification and processing
- subscription state synchronization
- cancellation
- plan change
- payment method replacement

This agent should be read together with:

- `@database.agent.md`
- `@onboarding.agent.md`
- `TENANT_DATABASE_PLAN.md`

## Business Rule

Subscriptions are enforced per company, not just per user.

That means billing records should ultimately map to the company or tenant context that owns access to the product.

## Important PayMongo Rules

- Use PayMongo Subscriptions API for recurring billing.
- Live subscriptions may require PayMongo-side activation or configuration before production use.
- Supported subscription payment methods currently include `card` and `Maya`.
- The first payment must be completed within `24 hours` or the subscription may be cancelled.
- Webhooks should be treated as the source of truth for recurring billing state.

## Recommended Module Shape

```txt
src/modules/billing/
  billing.controller.ts
  billing.service.ts
  billing.repository.ts
  billing.types.ts
  paymongo.service.ts
  paymongo.webhook.service.ts
  paymongo.mapper.ts
```

Responsibilities:

- `billing.controller.ts`
  HTTP endpoints for billing actions.
- `billing.service.ts`
  Application-level billing rules.
- `billing.repository.ts`
  Database reads and writes for billing records.
- `billing.types.ts`
  DTOs, enums, and internal billing types.
- `paymongo.service.ts`
  Raw PayMongo API integration.
- `paymongo.webhook.service.ts`
  Signature verification and webhook processing.
- `paymongo.mapper.ts`
  Payload normalization between PayMongo and local models.

## Suggested Environment Variables

```env
PAYMONGO_SECRET_KEY=
PAYMONGO_PUBLIC_KEY=
PAYMONGO_WEBHOOK_SECRET=
PAYMONGO_DEFAULT_CURRENCY=PHP
PAYMONGO_API_BASE_URL=https://api.paymongo.com/v1
```

Rules:

- `PAYMONGO_SECRET_KEY` must stay backend-only.
- `PAYMONGO_WEBHOOK_SECRET` must stay backend-only.
- `PAYMONGO_PUBLIC_KEY` is only needed if the frontend creates payment methods directly.

## Suggested Data Model

## `subscription_plans`

This stores local plans mapped to PayMongo plans.

Suggested fields:

- `id`
- `code`
- `name`
- `description`
- `currency`
- `amount`
- `interval`
- `interval_count`
- `trial_days`
- `paymongo_plan_id`
- `is_active`
- `metadata_json`
- `created_at`
- `updated_at`

## `billing_customers`

Suggested fields:

- `id`
- `company_id`
- `owner_user_id`
- `paymongo_customer_id`
- `email`
- `name`
- `phone`
- `metadata_json`
- `created_at`
- `updated_at`

## `company_subscriptions`

Suggested fields:

- `id`
- `company_id`
- `plan_id`
- `billing_customer_id`
- `paymongo_subscription_id`
- `paymongo_plan_id`
- `latest_invoice_id`
- `latest_payment_intent_id`
- `status`
- `amount`
- `currency`
- `interval`
- `interval_count`
- `starts_at`
- `trial_ends_at`
- `next_billing_at`
- `cancel_at`
- `cancelled_at`
- `ended_at`
- `failure_reason`
- `raw_payload_json`
- `created_at`
- `updated_at`

## `subscription_invoices`

Suggested fields:

- `id`
- `company_subscription_id`
- `paymongo_invoice_id`
- `paymongo_payment_intent_id`
- `amount_due`
- `amount_paid`
- `currency`
- `status`
- `billing_reason`
- `paid_at`
- `due_at`
- `raw_payload_json`
- `created_at`
- `updated_at`

## `billing_payment_methods`

Suggested fields:

- `id`
- `company_id`
- `company_subscription_id`
- `paymongo_payment_method_id`
- `type`
- `brand`
- `last4`
- `exp_month`
- `exp_year`
- `is_default`
- `raw_payload_json`
- `created_at`
- `updated_at`

## `webhook_events`

Suggested fields:

- `id`
- `provider`
- `event_type`
- `event_id`
- `signature`
- `payload_json`
- `is_verified`
- `is_processed`
- `processed_at`
- `processing_error`
- `created_at`

Recommended uniqueness:

- unique on `provider + event_id`

## Recommended Endpoints

## `POST /billing/plans/sync`

Admin-only endpoint that creates or syncs PayMongo plans.

Responsibilities:

- create PayMongo plan if no remote plan id exists
- sync local metadata
- avoid duplicate remote plan creation

## `POST /billing/subscriptions`

Creates or reuses a PayMongo customer, creates the subscription, and stores invoice and payment intent references.

Suggested request:

```json
{
  "companyId": "cmp_123",
  "planCode": "starter-monthly"
}
```

Suggested response:

```json
{
  "subscriptionId": "sub_local_123",
  "paymongoSubscriptionId": "sub_xxx",
  "paymongoCustomerId": "cus_xxx",
  "latestInvoiceId": "in_xxx",
  "latestPaymentIntentId": "pi_xxx",
  "status": "incomplete"
}
```

## `POST /billing/subscriptions/:id/attach-payment-method`

Suggested request:

```json
{
  "paymentMethodId": "pm_xxx"
}
```

Suggested response:

```json
{
  "status": "awaiting_authentication",
  "redirectUrl": "https://checkout.paymongo.com/..."
}
```

Responsibilities:

- verify company ownership
- load latest payment intent id
- attach payment method to the first invoice payment intent
- return redirect or next action data when authentication is required

## `POST /api/v1/webhooks/paymongo`

Responsibilities:

- read raw request body
- verify `Paymongo-Signature`
- store event
- deduplicate safely
- process event or queue it
- return fast `200`

## `POST /billing/subscriptions/:id/cancel`

Responsibilities:

- verify ownership or admin permission
- cancel with PayMongo when needed
- store local cancellation intent or final cancellation state
- wait for webhook-confirmed final state when applicable

## `POST /billing/subscriptions/:id/change-plan`

Responsibilities:

- verify target plan exists
- run supported PayMongo subscription change flow
- preserve history
- sync final state through webhooks

## `POST /billing/subscriptions/:id/change-payment-method`

Responsibilities:

- accept new payment method reference
- update stored default payment method
- use new method for future billing flows

## `GET /billing/subscriptions/:id`

Return subscription details, billing state, invoice summary, and renewal information.

## Core Backend Flow

## 1. Plan Setup

Create each plan once in PayMongo and store the returned `plan_id` locally.

Do not hardcode PayMongo plan IDs across multiple services.

## 2. Customer Setup

Create one PayMongo customer per billable company, or per billing owner if the business model requires that shape.

Recommended lookup priority:

1. local `billing_customers` mapping
2. controlled repair tooling for missing mappings

## 3. Subscription Creation

When a company selects a plan:

1. fetch the local plan
2. create or reuse PayMongo customer
3. create PayMongo subscription
4. store:
   - `paymongo_subscription_id`
   - `paymongo_plan_id`
   - `latest_invoice_id`
   - `latest_payment_intent_id`
   - returned status
5. return references needed by the frontend

## 4. First Payment

After subscription creation:

1. create payment method
2. attach payment method to the latest payment intent
3. inspect the returned next action
4. if `next_action.redirect.url` exists, return it to the frontend
5. wait for webhook confirmation before granting full paid access

## 5. Webhook Finalization

Use webhooks to finalize:

- active access
- failed payment state
- unpaid state
- renewal updates
- cancellation updates

## Webhook Events

At minimum, handle:

- `subscription.activated`
- `subscription.updated`
- `subscription.past_due`
- `subscription.unpaid`

Also consider invoice or payment-related events exposed by PayMongo for better reconciliation and support visibility.

## Webhook Processing Rules

- verify signature before processing
- store raw payload before heavy logic
- enforce idempotency using unique event id
- never assume ordered delivery
- re-fetch remote subscription if the event sequence looks suspicious

## Suggested Webhook Handler Flow

1. receive raw request body
2. read `Paymongo-Signature`
3. verify signature with `PAYMONGO_WEBHOOK_SECRET`
4. parse event
5. insert webhook event row if new
6. if duplicate, return `200`
7. locate local subscription using PayMongo identifiers
8. update local status, invoice fields, and billing dates
9. record invoice or payment intent changes when present
10. mark event as processed

## Suggested Local Statuses

- `incomplete`
- `trialing`
- `active`
- `past_due`
- `unpaid`
- `cancelled`
- `expired`

Keep the raw PayMongo status value too.

## Security Requirements

- never expose secret key to the browser
- authenticate every write endpoint
- verify company ownership before reading or mutating records
- validate all payloads
- log failures with safe redaction
- make webhook processing idempotent

## Testing Checklist

- create plan in test mode
- create customer successfully
- create subscription successfully
- attach a valid card payment method
- confirm redirect flow works
- confirm `subscription.activated` updates local DB
- trigger another billing cycle in test mode
- confirm renewal updates invoice history
- confirm failed payment transitions to `past_due` or `unpaid`
- confirm duplicate webhook delivery does not double-process
- confirm cancellation updates local subscription

## Go-Live Checklist

- verify live subscription capability is enabled on the PayMongo account
- switch all keys and webhook secrets to live values
- register live webhook endpoint
- confirm HTTPS and raw-body webhook verification support
- monitor the first live subscription end to end
- add alerting for webhook failures
- add admin tooling for billing lookup and repair

## Official References

- `https://developers.paymongo.com/docs/subscriptions-api`
- `https://developers.paymongo.com/reference/create-a-plan`
- `https://developers.paymongo.com/reference/create-a-subscription`
- `https://developers.paymongo.com/reference/create-a-paymentmethod`
- `https://developers.paymongo.com/reference/trigger-a-new-subscription-cycle`
- `https://developers.paymongo.com/docs/webhooks`
