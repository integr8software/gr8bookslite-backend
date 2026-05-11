# Backend Agents

This folder holds focused working documents for the system so implementation decisions stay scoped and clear.

Available agent docs:

- `@auth.agent.md`
- `@database.agent.md`
- `docs/onboarding/README.md`

Recommended ownership:

- `auth.agent.md`
  Covers signup, email OTP verification, resend/change-email flow, and login gating.
- `database.agent.md`
  Covers Prisma models, Postgres foreign keys, relation naming, cascades, and migration guardrails.
- `docs/onboarding/README.md`
  Documents the onboarding flow, temporary pre-company staging, and the rule that subscriptions are enforced per company.

Suggested next agent docs later:

- `tenant.agent.md`
  Covers per-company database provisioning and tenant resolution.
- `billing.agent.md`
  Covers paid plan upgrades, renewals, invoices, and subscription expiry handling.
- `bir.agent.md`
  Covers compliance assumptions, audit trails, exports, and BIR-facing report requirements.
