# Field Management Documentation

## 1. Purpose

The **Field Management** module (`FM`) provides an administrative system interface and API for configuring field-level visibility (`isVisible`) and requirement (`isRequired`) rules across all ERP modules.

It allows administrators to customize forms and workflows per module without modifying underlying codebase templates.

---

## 2. Architecture & File Layout

| Layer | Path | Responsibility |
| :--- | :--- | :--- |
| **Module** | `src/modules/system-administration/field-management/field-management.module.ts` | Registers controller, service, Prisma, and authentication guards. |
| **Controller** | `src/modules/system-administration/field-management/field-management.controller.ts` | Exposes REST endpoints under `api/v1/system-administration/field-management`. |
| **Service** | `src/modules/system-administration/field-management/field-management.service.ts` | Handles fetching all modules/fields, updating field configurations, adding fields, and validation. |
| **DTOs** | `src/modules/system-administration/field-management/dto/field-management.dto.ts` | Defines validation payloads for updating (`SaveModuleFieldsDto`) and creating (`CreateModuleFieldDto`) fields. |
| **Schema Model** | `prisma/schema.prisma` (`model ModuleField`) | Database entity for `module_fields`. |
| **Database Migration** | `prisma/migrations/20260820010000_add_module_field_management` | SQL migration creating `module_fields` table and foreign key constraints. |
| **Auto-Seeder** | `prisma/seeds/seedModuleFields.ts` | Scans frontend UI codebase for labels, inputs, and placeholders to discover and seed module fields automatically. |

---

## 3. Database Schema

### Table: `module_fields`

```prisma
model ModuleField {
  id              Int      @id @default(autoincrement())
  moduleId        Int      @map("module_id")
  fieldKey        String   @map("field_key")
  label           String
  sourcePath      String?  @map("source_path")
  fieldType       String?  @map("field_type")
  sortOrder       Int      @default(0) @map("sort_order")
  isVisible       Boolean  @default(true) @map("is_visible")
  isRequired      Boolean  @default(false) @map("is_required")
  defaultVisible  Boolean  @default(true) @map("default_visible")
  defaultRequired Boolean  @default(false) @map("default_required")
  metadata        Json     @default("{}")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")
  module          Module   @relation(fields: [moduleId], references: [id], onDelete: Cascade)

  @@unique([moduleId, fieldKey])
  @@index([moduleId, isVisible, sortOrder])
  @@map("module_fields")
}
```

---

## 4. API Specification

**Base URL**: `/api/v1/system-administration/field-management`  
**Authentication**: Bearer JWT (`JwtAuthGuard`)  
**Tag**: `Field Management`

### 1. Get All Modules and Fields
- **Method**: `GET /`
- **Rate Limit**: 120 req / minute
- **Description**: Returns all active modules ordered by name, each containing its sorted list of field configurations.
- **Response**: `200 OK`
```json
{
  "modules": [
    {
      "id": 1,
      "code": "COA",
      "name": "Chart of Accounts",
      "description": "Financial accounts management",
      "iconName": "scale",
      "isActive": true,
      "fields": [
        {
          "id": 101,
          "moduleId": 1,
          "fieldKey": "account_number",
          "label": "Account Number",
          "sourcePath": "financial-maintenance/charts-of-accounts/ChartsOfAccountsAccountFields.tsx",
          "fieldType": "text",
          "sortOrder": 0,
          "isVisible": true,
          "isRequired": true,
          "defaultVisible": true,
          "defaultRequired": true
        }
      ]
    }
  ]
}
```

### 2. Save Module Fields (Batch Update)
- **Method**: `PATCH /modules/:moduleId/fields`
- **Rate Limit**: 30 req / minute
- **Description**: Updates the `isVisible` and `isRequired` flags for a list of fields in the specified module. If `isVisible` is set to `false`, `isRequired` is enforced to `false`.
- **Request Body**:
```json
{
  "fields": [
    {
      "id": 101,
      "isVisible": true,
      "isRequired": true
    },
    {
      "id": 102,
      "isVisible": false,
      "isRequired": false
    }
  ]
}
```
- **Response**: `200 OK`
```json
{
  "message": "Module fields saved.",
  "module": {
    "id": 1,
    "code": "COA",
    "name": "Chart of Accounts",
    "description": "Financial accounts management",
    "iconName": "scale",
    "isActive": true,
    "fields": [ ... ]
  }
}
```

### 3. Add Custom Field Definition
- **Method**: `POST /modules/:moduleId/fields`
- **Rate Limit**: 30 req / minute
- **Description**: Creates a new field definition under the given module.
- **Request Body**:
```json
{
  "fieldKey": "custom_tax_id",
  "label": "Custom Tax Identifier",
  "fieldType": "text",
  "isVisible": true,
  "isRequired": false
}
```
- **Response**: `201 Created`
```json
{
  "message": "Module field added.",
  "field": {
    "id": 150,
    "moduleId": 1,
    "fieldKey": "custom_tax_id",
    "label": "Custom Tax Identifier",
    "sourcePath": null,
    "fieldType": "text",
    "sortOrder": 15,
    "isVisible": true,
    "isRequired": false,
    "defaultVisible": true,
    "defaultRequired": false
  }
}
```

---

## 5. Seed & Discovery Mechanism

[`seedModuleFields.ts`](file:///c:/Users/Bay/Integr8/gr8bookslite-backend/prisma/seeds/seedModuleFields.ts) provides automatic synchronization between UI code and the database:
1. Scans `gr8bookslite-frontend/app/src/ui/modules/` directories based on the catalog directory hints for each module.
2. Extracts UI inputs by matching regex patterns against `label="..."`, `aria-label="..."`, and `placeholder="..."`.
3. Normalizes discovered strings into unique snake_case `field_key`s and infers data types (`text`, `number`, `date`, `email`, `select`).
4. Upserts records into `module_fields` with default visibility `true` and default required `false`.
