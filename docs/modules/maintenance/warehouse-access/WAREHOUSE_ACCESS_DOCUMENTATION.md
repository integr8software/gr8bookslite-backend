# Warehouse Access Documentation

## Purpose

Warehouse Access manages which company users can access specific warehouses and branches. It is an assignment module that protects inventory operations from showing or using warehouses outside a user's permitted scope.

## Architecture

| Layer | File | Responsibility |
| --- | --- | --- |
| Module | `warehouse-access.module.ts` | Registers Prisma, access control, auth, service, and lookup service. |
| Controller | `warehouse-access.controller.ts` | Exposes REST endpoints under `maintenance/warehouse-access`. |
| Service | `warehouse-access.service.ts` | Handles list, directory lookup, detail, create, update, revoke, validation, statistics, and audit-user mapping. |
| Lookup service | `lookups/warehouse-access-lookup.service.ts` | Provides directory user lookup for assignment screens. |
| DTOs | `dto/*` | Defines assignment, directory, list, update, and response contracts. |
| Mapper | `mappers/warehouse-access.mapper.ts` | Maps warehouse access records and relations to API responses. |
| Utilities | `utils/warehouse-access-permission.util.ts` | Encapsulates access permission helpers. |
| Prisma include | `prisma/warehouse-access.include.ts` | Centralizes relation includes for access records. |

## API Surface

Base path:

```text
/api/v1/maintenance/warehouse-access
```

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/` | Returns warehouse access assignments with statistics and permissions. |
| `GET` | `/directory/users` | Returns users and branches available for assignment. |
| `GET` | `/:id` | Returns one assignment. |
| `POST` | `/` | Creates assignments. |
| `PATCH` | `/:id` | Updates an assignment. |
| `DELETE` | `/:id` | Revokes an assignment. |

## Data Model And Fields

The response DTO includes assignment identity, user information, warehouse information, branch information, status/audit metadata, and permission data. Directory responses include users and branch options needed to build assignment screens.

## Main Workflows

### List

`WarehouseAccessService.findAll` builds a company-scoped filter using user, warehouse, branch, status, and search query values. It includes related user/warehouse/branch data and returns statistics plus permissions.

### Directory Lookup

`findDirectoryUsers` and `WarehouseAccessLookupService.findDirectoryUsersForCompanyUser` return assignable users and branches for the active company. This powers create/update forms.

### Create

Create validates that users belong to the active company, warehouses exist for the company, and the request does not contain duplicate assignment combinations. It rejects assignments that are already unavailable.

### Update

Update loads the existing access record and validates the new assignment values before saving.

### Revoke

Delete routes call revoke behavior rather than physically removing all access history. This keeps assignment history and audit information intact.

## Validation And Business Rules

- Assignments are company-scoped.
- Users must belong to the company.
- Warehouses must belong to the company.
- Duplicate assignment combinations are rejected.
- Revoked/inactive assignments should not grant operational access.

## Permissions And Security

All routes require bearer authentication. Access assignment logic must stay server-side; clients should never decide warehouse access by local filtering alone.

## Extension Notes

- Keep access checks reusable through `warehouse-access-permission.util.ts`.
- Add tests for duplicate assignment rejection, user/company validation, warehouse/company validation, and revoke behavior.
