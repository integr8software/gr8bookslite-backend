# New Transaction Module Backend Integration

The authoritative guide and technical recipe for building backend integration for new transaction modules in Gr8Books Lite is located at:

**[`gr8bookslite-backend/docs/agents/guides/TRANSACTION_MODULE_BACKEND_INTEGRATION_GUIDE.md`](../agents/guides/TRANSACTION_MODULE_BACKEND_INTEGRATION_GUIDE.md)**

### Key Topics Covered:
1. **7 Mandatory Architectural Pillars**: Multi-tenant scoping, sequence number engine, master data snapshots, double-entry GL journal ledger (`jeno`), status lifecycle, cross-cutting enterprise systems, and OpenAPI/Orval generation pipeline.
2. **Directory Structure**: Standard subfolder layout (`dto/`, `mappers/`, `prisma/`, `services/`, `types/`, `utils/`).
3. **Database Modeling**: `schema.prisma` header and details patterns, immutable snapshots (`*Snapshot`), foreign key rules, and audit columns.
4. **DTOs & OpenAPI**: Validations using `class-validator`, query parameters, status transitions, and `@ApiProperty()` response models.
5. **Controller Layer**: REST route decorators, Swagger docs, thin controller delegation.
6. **Service Logic**: Auto-sequence resolution, atomic transactions (`prisma.$transaction`), and GL journal balancing verification ($\sum \text{Debit} = \sum \text{Credit}$).
7. **Cross-Cutting Integration**: Table Preferences, Field Management, Approval Management, and Form Signatories.
8. **Orval Client Generation**: Exporting `openapi.json` and running `npm run orval:generate`.
9. **Frontend Integration Checklist**: Next.js App Router routes, React Query hooks, removing mock data, dynamic BIR PDF previews.
