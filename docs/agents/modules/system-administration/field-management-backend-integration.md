# Field Management Backend Integration Guide

Use this guide when extending or integrating backend APIs with the **Field Management** (`FM`) module.

---

## 1. Module Overview

- **Module Code**: `FM`
- **Module Name**: Field Management
- **Category**: Maintenance / System Administration
- **Controller Route**: `/api/v1/system-administration/field-management`
- **Source Folder**: `src/modules/system-administration/field-management/`

---

## 2. Business Rules & Enforcement

1. **Hierarchy**: Every field (`ModuleField`) belongs to a single parent `Module` via `moduleId`.
2. **Key Uniqueness**: `(module_id, field_key)` is uniquely constrained.
3. **Visibility & Requirement Invariance**: A field that is hidden (`isVisible = false`) can never be required (`isRequired = false`). The service layer enforces `isRequired = false` whenever `isVisible = false` in both `saveModuleFields` and `createModuleField`.
4. **Ordering**: Module fields are ordered primarily by `sortOrder ASC`, then `label ASC`.

---

## 3. Extending the API

When adding features such as company-specific field overrides or default values:
- Update `schema.prisma` with optional `companyId` foreign key if field preferences are scoped per tenant.
- Add corresponding unit and integration tests in `test/modules/system-administration/field-management.e2e-spec.ts`.
- Ensure `seedModuleFields.ts` maintains parity with new frontend module directories.
