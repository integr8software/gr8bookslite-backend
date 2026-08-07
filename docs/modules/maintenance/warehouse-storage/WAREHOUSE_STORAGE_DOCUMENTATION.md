# Warehouse Storage Documentation

## Purpose

Warehouse Storage provides read access to the warehouse storage maintenance area. It is currently a lightweight module that exposes a list endpoint and exports a lookup service for other warehouse-related modules.

## Architecture

| Layer | File | Responsibility |
| --- | --- | --- |
| Module | `warehouse-storage.module.ts` | Registers access control, auth, service, and lookup service. |
| Controller | `warehouse-storage.controller.ts` | Exposes REST endpoints under `maintenance/warehouse-storage`. |
| Service | `warehouse-storage.service.ts` | Returns available warehouse storage menu/data and permission flags. |
| Lookup service | `lookups/warehouse-storage-lookup.service.ts` | Provides an exported lookup entry point for company-user scoped storage options. |

## API Surface

Base path:

```text
/api/v1/maintenance/warehouse-storage
```

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/` | Returns warehouse storage data and permissions. |

## Main Workflows

### List

`WarehouseStorageService.findAll` evaluates the authenticated user's permissions and returns the storage response expected by the UI.

### Lookup Export

`WarehouseStorageLookupService` is registered and exported from the module so related modules can depend on it as the storage lookup surface evolves.

## Validation And Business Rules

- The module is authenticated and permission-aware.
- Current behavior is intentionally read-oriented.
- Future storage option behavior should follow the same lookup shape documented in `../MAINTENANCE_LOOKUP_OPTIONS_DOCUMENTATION.md`.

## Permissions And Security

The controller uses `JwtAuthGuard`. Permission evaluation is kept in the service so UI screens can rely on server-computed action flags.

## Extension Notes

- Add DTOs when the response shape grows beyond a simple read payload.
- Add tests when storage options become data-backed or branch-scoped.
- Keep exported lookup behavior compatible with other warehouse modules.
