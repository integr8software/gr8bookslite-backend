# Onboarding Backend Notes

## Core Rule

Subscriptions are company-owned.

- The paying entity is the `Company`
- The registering account is the future company admin and billing contact
- The admin user is not the subscription owner as an individual person
- If a company subscription expires, is canceled, or is otherwise unavailable, every member in that company loses access, including the admin

## Current Step Order

The frontend onboarding flow is:

1. Choose plan
2. Set up billing
3. Enter company details

Because steps 1 and 2 happen before a company record exists, the backend may temporarily store pre-company onboarding data in a staging record.

## Why A Draft Exists

`UserOnboardingDraft` is only temporary staging for:

- selected plan
- billing cycle
- billing contact details
- masked payment metadata such as card brand, last 4 digits, and expiry

It is not:

- a real subscription
- a replacement for `CompanySubscription`
- proof that the user already has access

## Source Of Truth For Access

Company access must always be decided from:

- `Membership`
- `Company`
- `CompanySubscription`

Never from:

- onboarding draft records
- admin user identity alone
- selected plan saved before company creation

## Intended Finalization Flow

After company details are submitted, the backend should:

1. Create the `Company`
2. Create the registering account as the first admin `Membership`
3. Create the `CompanySubscription`
4. Set the trial window at the company subscription level
5. Enable or deny access based on company and company subscription status
6. Clear or archive the temporary onboarding draft

## Admin Lifecycle

The person who registers and completes onboarding should be treated as:

- the initial company admin
- the primary billing contact
- the user who can later manage additional members and access control for the company

That does not change the subscription owner rule:

- access is still enforced from the company and its subscription state
- the admin loses company access too if the company subscription expires

## Important Guardrail

If the company subscription is expired, canceled, failed, or otherwise not active/trialing, the entire company context should be denied.

That denial applies to:

- admin users
- regular users
- invited or existing members using that company context
