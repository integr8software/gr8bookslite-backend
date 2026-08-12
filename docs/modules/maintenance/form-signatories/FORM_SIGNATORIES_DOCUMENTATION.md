# Form Signatories Documentation

## Purpose

Form Signatories manages authorized signatory rows for company forms. A setup is scoped to a company unit/branch and module, and contains rows such as prepared by, checked by, approved by, or other signature labels used in generated forms and reports.

## Architecture

| Layer | File | Responsibility |
| --- | --- | --- |
| Module | `form-signatories.module.ts` | Registers Prisma, access control, entitlement, auth, workspace audit logs, service, and lookup service. |
| Controller | `form-signatories.controller.ts` | Exposes REST endpoints under `maintenance/form-signatories`. |
| Service | `form-signatories.service.ts` | Handles list, options, bootstrap, resolve, detail, save, update, row normalization/replacement, audit logging, and unit validation. |
| Lookup service | `lookups/form-signatories-lookup.service.ts` | Returns branch/unit and module options. |
| DTOs | `dto/*` | Defines save rows and response contracts. |
| Mapper | `mappers/form-signatory.mapper.ts` | Maps setup, unit, module, and row data to response DTOs. |
| Prisma include | `prisma/form-signatory.include.ts` | Centralizes setup relation includes. |
| Types | `types/form-signatory.type.ts` | Defines setup relation payload types. |

## API Surface

Base path:

```text
/api/v1/maintenance/form-signatories
```

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/` | Returns all signatory setups for the company. |
| `GET` | `/options` | Returns branch/unit and module options. |
| `GET` | `/bootstrap` | Returns options and existing setups together. |
| `GET` | `/resolve` | Resolves the setup for unit and module query values. |
| `GET` | `/:setupId` | Returns one setup. |
| `POST` | `/` | Saves a new setup. |
| `PATCH` | `/:setupId` | Updates an existing setup. |

## Data Model And Fields

Setup fields:

- `id`, `companyId`
- `unit`
- `module`
- `rows`
- `createdAt`, `updatedAt`

Row fields:

- `id`
- `label`
- `name`
- `position`
- `signatureName`
- `signatureImage`
- `signatureValidUntil`
- `isThisTemporary`

Option response:

```json
{
  "branches": [],
  "modules": []
}
```

Bootstrap response extends options with:

```json
{
  "setups": []
}
```

## Main Workflows

### Options And Bootstrap

Options return the unit/branch choices and module choices needed to build the screen. Bootstrap combines options with all existing setups so the frontend can load the maintenance UI in one request.

### Resolve

Resolve takes a unit and module query and returns the matching setup when it exists. This is useful for document generation or setup editing flows.

### Save And Update

The service validates that the unit belongs to the company, resolves the target module, normalizes rows, and writes setup rows transactionally. Update replaces rows so the stored setup mirrors the submitted form.

### Audit Logging

Create/update/delete style changes are recorded through workspace audit log support so signatory configuration changes are traceable.

## Validation And Business Rules

- Unit/branch must belong to the active company.
- A setup is scoped by unit and module.
- Rows are normalized before write.
- Dates and optional temporary-signature fields are normalized server-side.

## Permissions And Security

All routes require authenticated access. The module imports entitlement and workspace audit log support, so changes should preserve entitlement checks and audit behavior.

## Extension Notes

- Keep row replacement transactional.
- Add tests for resolve behavior, row normalization, duplicate setup prevention, and audit logging when changing this module.
