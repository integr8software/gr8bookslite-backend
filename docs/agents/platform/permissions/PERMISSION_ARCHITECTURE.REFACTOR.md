You are working on a NestJS + Prisma + PostgreSQL + Next.js ERP system called Gr8Books Neo.

Goal:
Refactor the permission architecture cleanly using short stable permission codes from the Excel access matrix.

Important decision:
Use short uppercase business codes instead of long slug codes.

Example:

- Use PCFR for Petty Cash Fund Replenishment.
- Do not use cash-disbursement-petty-cash-fund-replenishment.
- Do not use CDPCFR unless needed for uniqueness.
- The module relationship already identifies that PCFR belongs under Cash Disbursement.

Target idea:
txt Module: Cash Disbursement Module Code: CD Submodule: Petty Cash Fund Replenishment Submodule Code: PCFR Permission Code: PCFR Actions: view, create, update, delete, approve, export

Legacy Excel-style action codes should be treated as import/mapping references only:

txt PCFR_VIEW -> permissionCode: PCFR, action: view PCFR_ADD -> permissionCode: PCFR, action: create PCFR_EDIT -> permissionCode: PCFR, action: update PCFR_DEL -> permissionCode: PCFR, action: delete PCFR_APPROVE -> permissionCode: PCFR, action: approve PCFR_EXPORT -> permissionCode: PCFR, action: export

Do not store every action code like PCFR_ADD as a separate permission row.

Final database direction:

1. Keep platform_modules.
2. Add platform_submodules.
3. Keep permissions, but make the target explicit.
4. Keep company_role_permissions with boolean action columns.
5. Keep membership_permissions with nullable boolean action overrides.
6. Backend owns the permission catalog.
7. Frontend must not create permission catalog rows.

Target schema concept:

txt platform_modules id code unique, example: CD name example: Cash Disbursement sort_order is_active created_at updated_at platform_submodules id module_id code globally unique, example: PCFR name example: Petty Cash Fund Replenishment route nullable sort_order is_active created_at updated_at permissions id code globally unique, usually same as submodule code name target_type MODULE or SUBMODULE module_id nullable submodule_id nullable scope_level requires_company_context is_active created_at updated_at company_role_permissions company_role_id permission_id can_view can_create can_update can_delete can_approve can_export membership_permissions membership_user_id membership_company_id permission_id can_view nullable can_create nullable can_update nullable can_delete nullable can_approve nullable can_export nullable

Important constraints:

- platform_modules.code must be unique.
- platform_submodules.code must be globally unique.
- permissions.code must be globally unique.
- For target_type = MODULE, module_id must not be null and submodule_id must be null.
- For target_type = SUBMODULE, submodule_id must not be null.
- If both module_id and submodule_id exist, the submodule must belong to that module.
- Permission codes must be stable and should not change after deployment.

Backend catalog ownership:
Create seed/migration data for modules, submodules, and permissions using the Excel access matrix.

Add endpoint:

http GET /api/v1/company/units/:unitId/roles/permission-catalog

Example response:

json { "modules": [ { "code": "CD", "name": "Cash Disbursement", "submodules": [ { "code": "PCFR", "name": "Petty Cash Fund Replenishment", "permissionCode": "PCFR", "actions": ["view", "create", "update", "delete", "approve", "export"] } ] } ] }

Refactor role create/update payload to use codes and actions only:

json { "name": "Cashier", "description": "Handles petty cash.", "permissions": [ { "permissionCode": "PCFR", "actions": ["view", "create", "update"] } ] }

Backend responsibilities:

- Validate every submitted permissionCode.
- Reject unsupported permission codes.
- Resolve permission name, module, submodule, and target type from backend catalog.
- Convert action arrays into boolean columns.
- Do not trust frontend-submitted module names, submodule names, or permission names.
- Keep compatibility for legacy payloads temporarily if they exist.
- Keep old permission-code normalization temporarily during rollout.

Frontend responsibilities:

- User Role screen should fetch the backend permission catalog.
- Frontend sidebar can still use the same short stable codes.
- Frontend must not create/upsert modules, submodules, or permissions.
- Rename ambiguous frontend fields like submodule.value to permissionCode or resourceCode.
- Saving a role should send only permissionCode and actions.
- Existing roles must reopen with current selected actions.

Migration plan:

1. Inspect current Prisma schema, role services, permission services, DTOs, guards, frontend User Role screen, and sidebar registry.
2. Add platform_submodules.
3. Add explicit permission target fields: target_type, module_id, submodule_id.
4. Backfill submodules from existing permissions.
5. Convert long/legacy permission codes to short codes where safe.
6. Preserve all company_role_permissions.
7. Preserve all membership_permissions.
8. When duplicate permissions are merged:
   - Role grants merge using OR logic.
   - Membership overrides preserve explicit true/false values.
   - Null means inherit from role.
9. Add backend permission catalog endpoint.
10. Update role create/update DTOs.
11. Update frontend User Role screen to read backend catalog.
12. Keep legacy compatibility until both frontend and backend are deployed.
13. Remove legacy fields only after migration is verified.

Action mapping:
Use this normalized mapping:

txt VIEW -> can_view ADD -> can_create EDIT -> can_update DEL -> can_delete DELETE -> can_delete APPROVED -> can_approve APPROVE -> can_approve EXPORT -> can_export

Business rule:
If create/update/delete/approve/export is true, ensure view is also true unless the existing business logic says otherwise.

Testing:

- Compare permission assignment counts before and after migration.
- Confirm no company role permissions are lost.
- Confirm no membership overrides are lost.
- Confirm old roles reopen correctly.
- Confirm new role save works using short codes.
- Confirm unsupported permission codes are rejected.
- Confirm permission catalog order follows module/submodule sort order.
- Confirm frontend no longer creates catalog rows.
- Confirm access guards still work.
- Confirm old frontend and new backend can temporarily work together during rollout.

Deliverables:

- Prisma schema changes.
- Prisma migration.
- Seed or migration script for permission catalog.
- Backend DTO updates.
- Backend service/controller updates.
- Permission catalog endpoint.
- Frontend User Role integration.
- Compatibility handling for legacy payloads.
- Tests or manual verification checklist.
- Short documentation explaining the new permission architecture.

Do this carefully in phases. First inspect and explain what files need to change before editing. Then implement the smallest safe migration first.

# Permission Architecture Refactor

## AI Implementation Instructions

You are working on a NestJS + Prisma + PostgreSQL + Next.js ERP system called **Gr8Books Neo**.

Before changing code:

1. Read this entire document.
2. Inspect the current implementation first.
3. Identify impacted files before editing.
4. Do not rewrite everything at once.
5. Implement the refactor phase by phase.
6. Preserve existing customer data.
7. Maintain backward compatibility during rollout.
8. Implement the smallest safe migration first.

---

## Goal

Refactor the permission architecture cleanly using short, stable permission codes from the Excel access matrix.

The new permission model should be:

- easier to understand,
- easier to maintain,
- backend-owned,
- safe for database migration,
- compatible with existing role and membership assignments.

---

## Main Decision

Use short uppercase ERP/business codes instead of long slug-style permission codes.

### Good

```txt
PCFR
APV
PCA
```

### Avoid

```txt
cash-disbursement-petty-cash-fund-replenishment
CDPCFR
```

Use prefixed codes such as `CDPCFR` only when needed for uniqueness.

Reason:

The module relationship already identifies where the submodule belongs. For example, `PCFR` can belong under the `Cash Disbursement` module without needing the module name inside the permission code.

---

## Example Target Structure

```txt
Module: Cash Disbursement
Module Code: CD

Submodule: Petty Cash Fund Replenishment
Submodule Code: PCFR

Permission Code: PCFR
Actions: view, create, update, delete, approve, export
```

---

## Legacy Excel Code Mapping

Legacy Excel-style action codes should be treated as import/mapping references only.

```txt
PCFR_VIEW    -> permissionCode: PCFR, action: view
PCFR_ADD     -> permissionCode: PCFR, action: create
PCFR_EDIT    -> permissionCode: PCFR, action: update
PCFR_DEL     -> permissionCode: PCFR, action: delete
PCFR_APPROVE -> permissionCode: PCFR, action: approve
PCFR_EXPORT  -> permissionCode: PCFR, action: export
```

Do **not** store every action code like `PCFR_ADD`, `PCFR_EDIT`, or `PCFR_VIEW` as separate permission rows.

Instead, store one permission/resource and many action flags.

```txt
Permission/resource: PCFR
Actions: view, create, update, delete, approve, export
```

---

## Final Database Direction

1. Keep `platform_modules`.
2. Add `platform_submodules`.
3. Keep `permissions`, but make the target explicit.
4. Keep `company_role_permissions` with boolean action columns.
5. Keep `membership_permissions` with nullable boolean action overrides.
6. Backend owns the permission catalog.
7. Frontend must not create or upsert permission catalog rows.

---

## Target Schema Concept

```txt
platform_modules
  id
  code              unique, example: CD
  name              example: Cash Disbursement
  sort_order
  is_active
  created_at
  updated_at

platform_submodules
  id
  module_id
  code              globally unique, example: PCFR
  name              example: Petty Cash Fund Replenishment
  route             nullable
  sort_order
  is_active
  created_at
  updated_at

permissions
  id
  code              globally unique, usually same as submodule code
  name
  target_type       MODULE or SUBMODULE
  module_id         nullable
  submodule_id      nullable
  scope_level
  requires_company_context
  is_active
  created_at
  updated_at

company_role_permissions
  company_role_id
  permission_id
  can_view
  can_create
  can_update
  can_delete
  can_approve
  can_export

membership_permissions
  membership_user_id
  membership_company_id
  permission_id
  can_view          nullable
  can_create        nullable
  can_update        nullable
  can_delete        nullable
  can_approve       nullable
  can_export        nullable
```

---

## Important Database Constraints

The implementation should enforce these rules:

- `platform_modules.code` must be unique.
- `platform_submodules.code` must be globally unique.
- `permissions.code` must be globally unique.
- For `target_type = MODULE`, `module_id` must not be null and `submodule_id` must be null.
- For `target_type = SUBMODULE`, `submodule_id` must not be null.
- If both `module_id` and `submodule_id` exist, the submodule must belong to that module.
- Permission codes must be stable and should not change after deployment.

---

## Backend Catalog Ownership

The backend must own the permission catalog.

Create seed or migration data for:

- modules,
- submodules,
- permissions.

Use the Excel access matrix as the mapping reference.

The frontend must only read the catalog. It must not create, upsert, or rename permission catalog rows.

---

## Permission Catalog Endpoint

Add or refactor this endpoint:

```http
GET /api/v1/company/units/:unitId/roles/permission-catalog
```

### Example Response

```json
{
  "modules": [
    {
      "code": "CD",
      "name": "Cash Disbursement",
      "submodules": [
        {
          "code": "PCFR",
          "name": "Petty Cash Fund Replenishment",
          "permissionCode": "PCFR",
          "actions": ["view", "create", "update", "delete", "approve", "export"]
        }
      ]
    }
  ]
}
```

---

## Role Create/Update Payload

Refactor role create/update payloads to use permission codes and actions only.

### Preferred Payload

```json
{
  "name": "Cashier",
  "description": "Handles petty cash.",
  "permissions": [
    {
      "permissionCode": "PCFR",
      "actions": ["view", "create", "update"]
    }
  ]
}
```

The backend should resolve the permission name, module, submodule, and target type from the backend catalog.

---

## Backend Responsibilities

The backend must:

- validate every submitted `permissionCode`,
- reject unsupported permission codes,
- resolve permission name, module, submodule, and target type from the backend catalog,
- convert action arrays into boolean columns,
- avoid trusting frontend-submitted module names, submodule names, or permission names,
- keep compatibility for legacy payloads temporarily,
- keep old permission-code normalization temporarily during rollout.

---

## Frontend Responsibilities

The frontend must:

- fetch the User Role permission catalog from the backend,
- keep using the same short stable codes in the sidebar registry where needed,
- stop creating or upserting modules, submodules, or permissions,
- rename ambiguous fields like `submodule.value` to `permissionCode` or `resourceCode` where appropriate,
- send only `permissionCode` and `actions` when saving roles,
- reopen existing roles with their currently selected actions.

---

## Migration Plan

### Phase 1: Inspect Current Implementation

Inspect these areas first:

- Prisma schema,
- role services,
- permission services,
- DTOs,
- guards,
- frontend User Role screen,
- sidebar registry.

Do not edit immediately. First list the files that need changes.

### Phase 2: Add Submodule Catalog

1. Add `platform_submodules`.
2. Add explicit permission target fields:
   - `target_type`,
   - `module_id`,
   - `submodule_id`.
3. Backfill submodules from existing permissions.
4. Keep old relations temporarily for compatibility.

### Phase 3: Short Code Migration

1. Convert long or legacy permission codes to short codes where safe.
2. Keep a temporary mapping for legacy codes.
3. Preserve all `company_role_permissions`.
4. Preserve all `membership_permissions`.

When duplicate permissions are merged:

- role grants merge using OR logic,
- membership overrides preserve explicit `true` or `false` values,
- `null` means inherit from role.

### Phase 4: Backend Catalog API

1. Add the permission catalog endpoint.
2. Update role create/update DTOs.
3. Validate submitted permission codes.
4. Convert action arrays into boolean grant columns.
5. Reject unsupported permission codes.

### Phase 5: Frontend Integration

1. Update the User Role screen to read the backend catalog.
2. Stop deriving permission options from the sidebar as the source of truth.
3. Keep sidebar codes aligned with backend permission codes.
4. Save roles using `permissionCode` and `actions` only.

### Phase 6: Cleanup

Only after migration is verified:

1. Remove legacy DTO fields.
2. Remove old frontend catalog creation logic.
3. Remove temporary code normalization.
4. Update documentation.

---

## Action Mapping

Use this normalized action mapping:

```txt
VIEW      -> can_view
ADD       -> can_create
CREATE    -> can_create
EDIT      -> can_update
UPDATE    -> can_update
DEL       -> can_delete
DELETE    -> can_delete
APPROVED  -> can_approve
APPROVE   -> can_approve
EXPORT    -> can_export
```

---

## Business Rule

If any of these actions are true:

```txt
create
update
delete
approve
export
```

then `view` should also be true, unless the existing business logic explicitly says otherwise.

---

## Testing Checklist

Add tests or manual verification for the following:

- Compare permission assignment counts before and after migration.
- Confirm no company role permissions are lost.
- Confirm no membership overrides are lost.
- Confirm old roles reopen correctly.
- Confirm new role save works using short codes.
- Confirm unsupported permission codes are rejected.
- Confirm permission catalog order follows module and submodule sort order.
- Confirm frontend no longer creates catalog rows.
- Confirm access guards still work.
- Confirm old frontend and new backend can temporarily work together during rollout.
- Confirm new frontend and compatible backend can temporarily work together during rollout.

---

## Deliverables

The implementation should include:

- Prisma schema changes,
- Prisma migration,
- seed or migration script for the permission catalog,
- backend DTO updates,
- backend service/controller updates,
- permission catalog endpoint,
- frontend User Role integration,
- compatibility handling for legacy payloads,
- tests or manual verification checklist,
- short documentation explaining the new permission architecture.

---

## Final Reminder

Do this carefully in phases.

First inspect and explain what files need to change before editing. Then implement the smallest safe migration first.

# Permission Architecture Refactor

## AI Implementation Instructions

You are working on a NestJS + Prisma + PostgreSQL + Next.js ERP system called **Gr8Books Neo**.

Before changing code:

1. Read this entire document.
2. Inspect the current implementation first.
3. Identify impacted files before editing.
4. Do not rewrite everything at once.
5. Implement the refactor phase by phase.
6. Preserve existing customer data.
7. Maintain backward compatibility during rollout.
8. Implement the smallest safe migration first.

---

## Goal

Refactor the permission architecture cleanly using short, stable permission codes from the Excel access matrix.

The new permission model should be:

- easier to understand,
- easier to maintain,
- backend-owned,
- safe for database migration,
- compatible with existing role and membership assignments.

---

## Main Decision

Use short uppercase ERP/business codes instead of long slug-style permission codes.

### Good

```txt
PCFR
APV
PCA
```

### Avoid

```txt
cash-disbursement-petty-cash-fund-replenishment
CDPCFR
```

Use prefixed codes such as `CDPCFR` only when needed for uniqueness.

Reason:

The module relationship already identifies where the submodule belongs. For example, `PCFR` can belong under the `Cash Disbursement` module without needing the module name inside the permission code.

---

## Final Action Model

Use these standard actions moving forward:

```txt
view
create
update
cancel
uncancel
export
```

Important changes from the old model:

- Replace `delete` with `cancel`.
- Add `uncancel`.
- Remove `approve`.
- Do not use `can_delete` for new permission logic.
- Do not use `can_approve` for new permission logic.

Reason:

ERP records should usually not be physically deleted. Instead, business documents are cancelled and may sometimes be uncancelled depending on company rules.

---

## Example Target Structure

```txt
Module: Cash Disbursement
Module Code: CD

Submodule: Petty Cash Fund Replenishment
Submodule Code: PCFR

Permission Code: PCFR
Actions: view, create, update, cancel, uncancel, export
```

---

## Legacy Excel Code Mapping

Legacy Excel-style action codes should be treated as import/mapping references only.

```txt
PCFR_VIEW      -> permissionCode: PCFR, action: view
PCFR_ADD       -> permissionCode: PCFR, action: create
PCFR_EDIT      -> permissionCode: PCFR, action: update
PCFR_DEL       -> permissionCode: PCFR, action: cancel
PCFR_DELETE    -> permissionCode: PCFR, action: cancel
PCFR_CANCEL    -> permissionCode: PCFR, action: cancel
PCFR_UNCANCEL  -> permissionCode: PCFR, action: uncancel
PCFR_EXPORT    -> permissionCode: PCFR, action: export
```

Old approve-related codes should not become active permission actions in the new model.

```txt
PCFR_APPROVE   -> deprecated / ignore / migrate only if business confirms replacement
PCFR_APPROVED  -> deprecated / ignore / migrate only if business confirms replacement
```

Do **not** store every action code like `PCFR_ADD`, `PCFR_EDIT`, or `PCFR_CANCEL` as separate permission rows.

Instead, store one permission/resource and many action flags.

```txt
Permission/resource: PCFR
Actions: view, create, update, cancel, uncancel, export
```

---

## Final Database Direction

1. Keep `platform_modules`.
2. Add `platform_submodules`.
3. Keep `permissions`, but make the target explicit.
4. Keep `company_role_permissions` with boolean action columns.
5. Keep `membership_permissions` with nullable boolean action overrides.
6. Backend owns the permission catalog.
7. Frontend must not create or upsert permission catalog rows.

---

## Target Schema Concept

```txt
platform_modules
  id
  code              unique, example: CD
  name              example: Cash Disbursement
  sort_order
  is_active
  created_at
  updated_at

platform_submodules
  id
  module_id
  code              globally unique, example: PCFR
  name              example: Petty Cash Fund Replenishment
  route             nullable
  sort_order
  is_active
  created_at
  updated_at

permissions
  id
  code              globally unique, usually same as submodule code
  name
  target_type       MODULE or SUBMODULE
  module_id         nullable
  submodule_id      nullable
  scope_level
  requires_company_context
  is_active
  created_at
  updated_at

company_role_permissions
  company_role_id
  permission_id
  can_view
  can_create
  can_update
  can_cancel
  can_uncancel
  can_export

membership_permissions
  membership_user_id
  membership_company_id
  permission_id
  can_view          nullable
  can_create        nullable
  can_update        nullable
  can_cancel        nullable
  can_uncancel      nullable
  can_export        nullable
```

### Legacy Column Compatibility

If the current database already has `can_delete` or `can_approve`, do not drop them immediately.

Recommended compatibility approach:

1. Add `can_cancel` and `can_uncancel` first.
2. Migrate existing `can_delete` values into `can_cancel` if the business agrees that old delete means cancel.
3. Leave `can_approve` unused or deprecated unless there is a confirmed replacement.
4. Keep old columns temporarily during rollout.
5. Drop old columns only after backend, frontend, and data validation are complete.

---

## Important Database Constraints

The implementation should enforce these rules:

- `platform_modules.code` must be unique.
- `platform_submodules.code` must be globally unique.
- `permissions.code` must be globally unique.
- For `target_type = MODULE`, `module_id` must not be null and `submodule_id` must be null.
- For `target_type = SUBMODULE`, `submodule_id` must not be null.
- If both `module_id` and `submodule_id` exist, the submodule must belong to that module.
- Permission codes must be stable and should not change after deployment.

---

## Backend Catalog Ownership

The backend must own the permission catalog.

Create seed or migration data for:

- modules,
- submodules,
- permissions.

Use the Excel access matrix as the mapping reference.

The frontend must only read the catalog. It must not create, upsert, or rename permission catalog rows.

---

## Permission Catalog Endpoint

Add or refactor this endpoint:

```http
GET /api/v1/company/units/:unitId/roles/permission-catalog
```

### Example Response

```json
{
  "modules": [
    {
      "code": "CD",
      "name": "Cash Disbursement",
      "submodules": [
        {
          "code": "PCFR",
          "name": "Petty Cash Fund Replenishment",
          "permissionCode": "PCFR",
          "actions": [
            "view",
            "create",
            "update",
            "cancel",
            "uncancel",
            "export"
          ]
        }
      ]
    }
  ]
}
```

---

## Role Create/Update Payload

Refactor role create/update payloads to use permission codes and actions only.

### Preferred Payload

```json
{
  "name": "Cashier",
  "description": "Handles petty cash.",
  "permissions": [
    {
      "permissionCode": "PCFR",
      "actions": ["view", "create", "update", "cancel"]
    }
  ]
}
```

The backend should resolve the permission name, module, submodule, and target type from the backend catalog.

---

## Backend Responsibilities

The backend must:

- validate every submitted `permissionCode`,
- reject unsupported permission codes,
- resolve permission name, module, submodule, and target type from the backend catalog,
- convert action arrays into boolean columns,
- map `cancel` to `can_cancel`,
- map `uncancel` to `can_uncancel`,
- avoid trusting frontend-submitted module names, submodule names, or permission names,
- keep compatibility for legacy payloads temporarily,
- keep old permission-code normalization temporarily during rollout,
- avoid exposing `approve` as an active action unless the business explicitly reintroduces it.

---

## Frontend Responsibilities

The frontend must:

- fetch the User Role permission catalog from the backend,
- keep using the same short stable codes in the sidebar registry where needed,
- stop creating or upserting modules, submodules, or permissions,
- rename ambiguous fields like `submodule.value` to `permissionCode` or `resourceCode` where appropriate,
- display `Cancel` instead of `Delete`,
- display `Uncancel` as a separate action,
- remove `Approve` from the permission UI,
- send only `permissionCode` and `actions` when saving roles,
- reopen existing roles with their currently selected actions.

---

## Migration Plan

### Phase 1: Inspect Current Implementation

Inspect these areas first:

- Prisma schema,
- role services,
- permission services,
- DTOs,
- guards,
- frontend User Role screen,
- sidebar registry.

Do not edit immediately. First list the files that need changes.

### Phase 2: Add Submodule Catalog

1. Add `platform_submodules`.
2. Add explicit permission target fields:
   - `target_type`,
   - `module_id`,
   - `submodule_id`.
3. Backfill submodules from existing permissions.
4. Keep old relations temporarily for compatibility.

### Phase 3: Action Column Migration

1. Add `can_cancel` to `company_role_permissions` and `membership_permissions`.
2. Add `can_uncancel` to `company_role_permissions` and `membership_permissions`.
3. If confirmed by business, copy old `can_delete` values into `can_cancel`.
4. Do not copy `can_approve` automatically unless there is a confirmed business mapping.
5. Keep `can_delete` and `can_approve` temporarily for compatibility.
6. Remove `can_delete` and `can_approve` only after all code paths are migrated and tested.

### Phase 4: Short Code Migration

1. Convert long or legacy permission codes to short codes where safe.
2. Keep a temporary mapping for legacy codes.
3. Preserve all `company_role_permissions`.
4. Preserve all `membership_permissions`.

When duplicate permissions are merged:

- role grants merge using OR logic,
- membership overrides preserve explicit `true` or `false` values,
- `null` means inherit from role.

### Phase 5: Backend Catalog API

1. Add the permission catalog endpoint.
2. Update role create/update DTOs.
3. Validate submitted permission codes.
4. Convert action arrays into boolean grant columns.
5. Reject unsupported permission codes.
6. Do not return `approve` or `delete` as active actions.

### Phase 6: Frontend Integration

1. Update the User Role screen to read the backend catalog.
2. Stop deriving permission options from the sidebar as the source of truth.
3. Keep sidebar codes aligned with backend permission codes.
4. Save roles using `permissionCode` and `actions` only.
5. Replace `Delete` labels with `Cancel`.
6. Add `Uncancel` labels and handling.
7. Remove `Approve` labels and handling.

### Phase 7: Cleanup

Only after migration is verified:

1. Remove legacy DTO fields.
2. Remove old frontend catalog creation logic.
3. Remove temporary code normalization.
4. Remove deprecated `delete` and `approve` action handling.
5. Update documentation.

---

## Action Mapping

Use this normalized action mapping:

```txt
VIEW       -> can_view
ADD        -> can_create
CREATE     -> can_create
EDIT       -> can_update
UPDATE     -> can_update
DEL        -> can_cancel
DELETE     -> can_cancel
CANCEL     -> can_cancel
UNCANCEL   -> can_uncancel
EXPORT     -> can_export
APPROVE    -> deprecated / no active action
APPROVED   -> deprecated / no active action
```

---

## Business Rule

If any of these actions are true:

```txt
create
update
cancel
uncancel
export
```

then `view` should also be true, unless the existing business logic explicitly says otherwise.

---

## Testing Checklist

Add tests or manual verification for the following:

- Compare permission assignment counts before and after migration.
- Confirm no company role permissions are lost.
- Confirm no membership overrides are lost.
- Confirm old `can_delete` grants are migrated to `can_cancel` only if business confirms the mapping.
- Confirm old `can_approve` grants are not accidentally exposed as active permissions.
- Confirm old roles reopen correctly.
- Confirm new role save works using short codes.
- Confirm unsupported permission codes are rejected.
- Confirm unsupported actions like `delete` and `approve` are rejected or mapped only through legacy compatibility.
- Confirm permission catalog order follows module and submodule sort order.
- Confirm frontend no longer creates catalog rows.
- Confirm User Role UI shows `Cancel` and `Uncancel`.
- Confirm User Role UI no longer shows `Delete` or `Approve`.
- Confirm access guards still work.
- Confirm old frontend and new backend can temporarily work together during rollout.
- Confirm new frontend and compatible backend can temporarily work together during rollout.

---

## Deliverables

The implementation should include:

- Prisma schema changes,
- Prisma migration,
- seed or migration script for the permission catalog,
- backend DTO updates,
- backend service/controller updates,
- permission catalog endpoint,
- frontend User Role integration,
- compatibility handling for legacy payloads,
- tests or manual verification checklist,
- short documentation explaining the new permission architecture.

---

## Final Reminder

Do this carefully in phases.

First inspect and explain what files need to change before editing. Then implement the smallest safe migration first.
