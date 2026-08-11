# Backend Documentation

Use this directory map to find backend documentation by purpose.

## Architecture

Long-term system design and architecture decisions.

- `architecture/billing/` - billing and payment-attempt architecture
- `architecture/saas-entitlements/` - subscription-plan and entitlement architecture
- `architecture/sidebar/` - runtime sidebar and preference-delta architecture
- `architecture/tenant-bootstrap/` - company bootstrap and legacy tenant repair architecture

## Deployment

Environment setup, migration, provisioning, and storage deployment workflows.

- `deployment/database/` - database migration and staging data workflows
- `deployment/provisioning/` - platform provisioning framework and review
- `deployment/storage/` - VPS and filesystem storage deployment

## Guides

Day-to-day developer and operational guides.

- `guides/database/` - Prisma workflow
- `guides/development/` - Git and development workflow
- `guides/operations/` - backend script reference
- `guides/quality/` - QA, Swagger, and Jest quality guidelines

## Integrations

External service integration documentation.

- `integrations/paymongo/` - PayMongo current state, manual payments, staging audit, and route standards

## Modules

Feature-specific analysis, plans, verification, and reusable APIs.

- `modules/maintenance/` - shared maintenance APIs
- `modules/responsibility-center/` - Responsibility Center refactor documents
- `modules/tax/` - tax and default-account APIs

## Agent Instructions

Implementation instructions and working specifications intended for coding agents and developers.

- `agents/guides/` - cross-cutting architecture and integration rules
- `agents/domains/` - auth, billing, onboarding, address, and tax domain instructions
- `agents/platform/` - database, DevOps, permissions, and tenant platform instructions
- `agents/modules/` - module-specific implementation instructions
