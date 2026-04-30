# Backend Agents

This folder holds focused working documents for the system so implementation decisions stay scoped and clear.

Available agent docs:

- `@auth.agent.md`

Recommended ownership:

- `auth.agent.md`
  Covers signup, email OTP verification, resend/change-email flow, login gating, and free-trial subscription bootstrapping.

Suggested next agent docs later:

- `tenant.agent.md`
  Covers per-company database provisioning and tenant resolution.
- `database.agent.md`
  Covers Prisma schemas, migrations, shared DB, and tenant DB structure.
- `billing.agent.md`
  Covers paid plan upgrades, renewals, invoices, and subscription expiry handling.
- `bir.agent.md`
  Covers compliance assumptions, audit trails, exports, and BIR-facing report requirements.
