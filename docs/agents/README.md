# Backend Agents

This folder holds focused working documents for the system so implementation decisions stay scoped and clear.

Available agent docs:

- `domains/auth/auth.agent.md`
- `platform/database/database.agent.md`
- `domains/onboarding.agent.md`
- `domains/billing.agent.md`
- `domains/address-api.md`
- `guides/ARCHITECTURE_MODULARITY_GUIDE.md`
- `guides/BACKEND_INTEGRATION_GUIDE.md`
- `domains/TAX_MAINTENANCE_GLOBAL_ARCHITECTURE.md`

Recommended ownership:

- `domains/auth/auth.agent.md`
  Covers signup, email OTP verification, resend/change-email flow, and login gating.
- `platform/database/database.agent.md`
  Covers Prisma models, Postgres foreign keys, relation naming, cascades, and migration guardrails.
- `domains/onboarding.agent.md`
  Documents the onboarding flow, temporary pre-company staging, and the rule that subscriptions are enforced per company.
- `domains/billing.agent.md`
  Covers billing subscriptions, plans, provider setup, and payment-related behavior.
- `domains/address-api.md`
  Documents reusable Philippine address reference tables, seed data, hierarchy routes, and autocomplete API behavior.
- `guides/ARCHITECTURE_MODULARITY_GUIDE.md`
  Covers backend/frontend folder placement, reusable utilities, mappers, types, strategies, loading boundaries, and anti-redundancy rules for agents.
- `guides/BACKEND_INTEGRATION_GUIDE.md`
  Covers backend-to-frontend API integration contracts, DTOs, mappers, tenant-scoped query keys, seed/provision requirements, mock-data removal, and verification.
- `domains/TAX_MAINTENANCE_GLOBAL_ARCHITECTURE.md`
  Covers global jurisdiction-aware Tax definitions, effective rates, posting rules, company-owned account mappings, multi-tax calculation, and immutable transaction snapshots.

Suggested next agent docs later:

- `tenant.agent.md`
  Covers per-company database provisioning and tenant resolution.
- `bir.agent.md`
  Covers compliance assumptions, audit trails, exports, and BIR-facing report requirements.
