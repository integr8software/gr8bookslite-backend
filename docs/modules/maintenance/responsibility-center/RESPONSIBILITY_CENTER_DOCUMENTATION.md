# Responsibility Center Documentation

## Purpose

Responsibility Center manages financial and operational responsibility centers such as departments, branches, and projects. It supports classifications, types, hierarchy, code suggestions, and options used by transaction and reporting modules.

## Architecture

| Layer | File | Responsibility |
| --- | --- | --- |
| Module | `responsibility-center.module.ts` | Registers Prisma, access control, auth, main service, and lookup service. |
| Controller | `responsibility-center.controller.ts` | Exposes REST endpoints under `maintenance/financial-management/responsibility-centers`. |
| Service | `responsibility-center.service.ts` | Handles classifications, types, code suggestion, list, options, tree, detail, create, update, status update, hierarchy validation, statistics, and audit mapping. |
| Lookup service | `lookups/responsibility-center-lookup.service.ts` | Returns responsibility center options for selectors. |
| DTOs | `dto/*` | Defines create/update/status/list and response contracts. |
| Mapper | `mappers/responsibility-center.mapper.ts` | Maps center records with classification/type relations. |
| Utilities | `utils/responsibility-center-defaults.util.ts` | Provides default classification/type behavior. |
| Prisma include | `prisma/responsibility-center.include.ts` | Centralizes relation includes. |
| Seed | `seed/responsibility-center.seed.ts` | Seeds default classifications, types, and centers. |

## API Surface

Base path:

```text
/api/v1/maintenance/financial-management/responsibility-centers
```

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/` | Returns centers with statistics, pagination, and permissions. |
| `GET` | `/options` | Returns responsibility center options. |
| `GET` | `/options/:type` | Returns options filtered by type. |
| `GET` | `/tree` | Returns hierarchical center tree. |
| `GET` | `/classifications` | Returns responsibility center classifications. |
| `GET` | `/types` | Returns responsibility center types, optionally by classification. |
| `GET` | `/code-suggestion` | Suggests a center code for a type. |
| `GET` | `/:id` | Returns one center. |
| `POST` | `/` | Creates a center. |
| `PATCH` | `/:id` | Updates a center. |
| `PATCH` | `/:id/status` | Updates center status. |

## Data Model And Fields

Core center fields:

- `id`, `code`, `name`
- `classificationId`, `classificationCode`, `classificationName`
- `typeId`, `typeName`, `typeCodePrefix`
- `category`, `financialType`
- `manager`
- `parentId`, `parentName`
- `status`, `description`
- audit fields

Option response:

```json
{
  "responsibilityCenters": [
    {
      "id": "1",
      "code": "DEP-001",
      "name": "Accounting",
      "typeName": "Department",
      "status": "ACTIVE"
    }
  ]
}
```

## Main Workflows

### Classifications And Types

`findClassifications` returns active classification data. `findTypes` can filter types by classification and returns type metadata used by forms and code generation.

### Code Suggestion

`suggestCode` receives a type id and creates the next available code using the type prefix and existing center codes.

### List And Tree

List returns flat rows with statistics and permissions. Tree builds parent/child relationships from company-scoped centers to support hierarchy views.

### Create And Update

The service validates required text, active type, classification/type compatibility, parent center validity, hierarchy cycle prevention, unique names, and code availability.

### Status Update

Status updates can affect a center and may need descendant/ancestor checks depending on hierarchy behavior.

## Validation And Business Rules

- Center names and codes must be valid within the company.
- Parent centers must belong to the same company.
- Hierarchy cycles are rejected.
- Type must match the selected classification.
- Category and financial type are derived from classification/type behavior.

## Permissions And Security

All routes require bearer authentication. Company scope and hierarchy validation are enforced server-side.

## Extension Notes

- Add tests for hierarchy cycle prevention, type/classification mismatch, code suggestion, and tree building when changing this module.
- Keep classification/type defaults in the defaults utility and seed files.
