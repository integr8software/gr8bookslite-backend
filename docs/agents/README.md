# Backend Agents

This folder holds focused working documents for the system so implementation decisions stay scoped and clear.

Available agent docs:

- `@auth.agent.md`
- `@database.agent.md`

Recommended ownership:

- `auth.agent.md`
  Covers signup, email OTP verification, resend/change-email flow, login gating, and free-trial subscription bootstrapping.
- `database.agent.md`
  Covers Prisma models, Postgres foreign keys, relation naming, cascades, and migration guardrails.

Suggested next agent docs later:

- `tenant.agent.md`
  Covers per-company database provisioning and tenant resolution.
- `billing.agent.md`
  Covers paid plan upgrades, renewals, invoices, and subscription expiry handling.
- `bir.agent.md`
  Covers compliance assumptions, audit trails, exports, and BIR-facing report requirements.
