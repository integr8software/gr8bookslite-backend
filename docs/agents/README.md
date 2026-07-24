# Backend Agents

This folder holds focused working documents for the system so implementation decisions stay scoped and clear.

Available agent docs:

- `@auth.agent.md`
- `@database.agent.md`
- `@onboarding.agent.md`
- `@billing.agent.md`
- `address-api.md`
- `ARCHITECTURE_MODULARITY_GUIDE.md`
- `BACKEND_INTEGRATION_GUIDE.md`
- `TAX_MAINTENANCE_GLOBAL_ARCHITECTURE.md`

Recommended ownership:

- `auth.agent.md`
  Covers signup, email OTP verification, resend/change-email flow, and login gating.
- `database.agent.md`
  Covers Prisma models, Postgres foreign keys, relation naming, cascades, and migration guardrails.
- `onboarding.agent.md`
  Documents the onboarding flow, temporary pre-company staging, and the rule that subscriptions are enforced per company.
- `billing.agent.md`
  Covers billing subscriptions, plans, provider setup, and payment-related behavior.
- `address-api.md`
  Documents reusable Philippine address reference tables, seed data, hierarchy routes, and autocomplete API behavior.
- `ARCHITECTURE_MODULARITY_GUIDE.md`
  Covers backend/frontend folder placement, reusable utilities, mappers, types, strategies, loading boundaries, and anti-redundancy rules for agents.
- `BACKEND_INTEGRATION_GUIDE.md`
  Covers backend-to-frontend API integration contracts, DTOs, mappers, tenant-scoped query keys, seed/provision requirements, mock-data removal, and verification.
- `TAX_MAINTENANCE_GLOBAL_ARCHITECTURE.md`
  Covers global jurisdiction-aware Tax definitions, effective rates, posting rules, company-owned account mappings, multi-tax calculation, and immutable transaction snapshots.

Suggested next agent docs later:

- `tenant.agent.md`
  Covers per-company database provisioning and tenant resolution.
- `bir.agent.md`
  Covers compliance assumptions, audit trails, exports, and BIR-facing report requirements.
