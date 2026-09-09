# Tax Documentation

## Purpose

The Tax module owns the global tax catalog used by transaction modules, party defaults, tax dropdowns, and generated accounting entries.

Tax records are reference data. Company-specific accounting behavior is resolved separately through tax posting rules and company account mappings. Frontend modules should call the Tax API for tax codes, rates, descriptions, ATC values, and default tax account titles instead of keeping duplicate tax lists in UI constants or mock data.

## Runtime Ownership

| Concern                                                 | Owner                                       | Notes                                                                      |
| ------------------------------------------------------- | ------------------------------------------- | -------------------------------------------------------------------------- |
| Tax code, rate, description, transaction type, tax type | `Tax` table                                 | Global reference catalog seeded from `prisma/seed-data/tax.csv`.           |
| Posting side and account role                           | `TaxPostingRule` table                      | Seeded from tax type in `src/modules/tax/seed/tax.seed.ts`.                |
| Company chart account title/code                        | `CompanyAccountMapping` plus `ChartAccount` | Seeded during company chart account bootstrap for module code `TXM`.       |
| Dropdown grouping                                       | `TaxService`                                | Dedicated groups are exposed by `GET /api/v1/tax/default-account-options`. |
| Frontend generated client                               | OpenAPI plus Orval                          | Regenerate backend OpenAPI before running frontend Orval.                  |

## Main Files

| Area                     | File                                                                                                        |
| ------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Controller               | `src/modules/tax/tax.controller.ts`                                                                         |
| Service                  | `src/modules/tax/tax.service.ts`                                                                            |
| Module                   | `src/modules/tax/tax.module.ts`                                                                             |
| Query DTOs               | `src/modules/tax/dto/tax-list-query.dto.ts`, `src/modules/tax/dto/tax-default-account-options-query.dto.ts` |
| Response DTOs            | `src/modules/tax/dto/tax-response.dto.ts`                                                                   |
| Mapper                   | `src/modules/tax/mappers/tax-code.mapper.ts`                                                                |
| Prisma payload types     | `src/modules/tax/types/tax-prisma-payload.type.ts`                                                          |
| Posting rule seed        | `src/modules/tax/seed/tax.seed.ts`                                                                          |
| Tax seed data            | `prisma/seed-data/tax.csv`                                                                                  |
| Company TXM mapping seed | `src/modules/maintenance/chart-of-accounts/seed/chart-of-accounts.seed.ts`                                  |
| TXM mapping definitions  | `src/modules/maintenance/chart-of-accounts/seed/chart-of-accounts-system-groups.seed.ts`                    |

## Data Model

### Tax

`Tax` is the global source for selectable tax definitions:

- `sourceKey`: stable backend key used by party defaults and source-key APIs.
- `transactionType`: business context such as `Purchases`, `Sales`, or `Importation`.
- `taxType`: tax family such as `INPUT VAT`, `OUTPUT VAT`, `EWT`, `FWT`, `CWT`, or `WVAT`.
- `taxCode`: user-facing tax code.
- `officialAtcCode`: BIR ATC code when applicable.
- `taxDescription` and `natureOfIncome`: display/search text.
- `taxRate`: decimal rate serialized as a string at the API boundary.
- `taxExempt`, `sortOrder`, and `status`: selector behavior and ordering flags.

The tax row does not store a company chart account ID or account title.

### TaxPostingRule

`TaxPostingRule` links a tax definition to an accounting role:

| Tax Type     | Transaction Scope | Account Role                         | Entry Side |
| ------------ | ----------------- | ------------------------------------ | ---------- |
| `INPUT VAT`  | `PURCHASE`        | `INPUT_TAX_ACCOUNT`                  | `DEBIT`    |
| `OUTPUT VAT` | `SALE`            | `OUTPUT_VAT_ACCOUNT`                 | `CREDIT`   |
| `EWT`        | `PURCHASE`        | `EXPANDED_WITHHOLDING_TAX_ACCOUNT`   | `CREDIT`   |
| `FWT`        | `PURCHASE`        | `FINAL_WITHHOLDING_TAX_ACCOUNT`      | `CREDIT`   |
| `CWT`        | `SALE`            | `CREDITABLE_WITHHOLDING_TAX_ACCOUNT` | `DEBIT`    |
| `WVAT`       | `SALE`            | `WITHHOLDING_VATABLE_TAX_ACCOUNT`    | `DEBIT`    |

All current seeded rules use `postingEvent = RECOGNITION` and `amountSource = TAX_AMOUNT`.

### CompanyAccountMapping

`CompanyAccountMapping` resolves a posting rule's account role into an actual company chart account:

```text
Tax.taxType = EWT
  -> TaxPostingRule.accountRole = EXPANDED_WITHHOLDING_TAX_ACCOUNT
  -> CompanyAccountMapping.moduleCode = TXM and accountRole = EXPANDED_WITHHOLDING_TAX_ACCOUNT
  -> ChartAccount.accountTitle = Expanded Withholding Tax
```

This keeps global tax definitions reusable while allowing each company to own its chart account records.

## API Summary

All tax endpoints are authenticated through `JwtAuthGuard`.

| Method | Route                                       | Purpose                                                                             |
| ------ | ------------------------------------------- | ----------------------------------------------------------------------------------- |
| `GET`  | `/api/v1/tax`                               | Generic tax list with filters.                                                      |
| `GET`  | `/api/v1/tax/autocomplete`                  | Tax autocomplete payloads.                                                          |
| `GET`  | `/api/v1/tax/transaction-types`             | Distinct tax transaction types.                                                     |
| `GET`  | `/api/v1/tax/tax-types`                     | Distinct tax types.                                                                 |
| `GET`  | `/api/v1/tax/party-default-classifications` | Party Maintenance tax default classification metadata.                              |
| `GET`  | `/api/v1/tax/default-account-options`       | Dedicated repeated-use tax option groups with default account titles.               |
| `GET`  | `/api/v1/tax/:sourceKey`                    | Single tax by source key.                                                           |
| `GET`  | `/api/v1/tax-default-accounts`              | Generic tax list with posting accounts and company default chart account summaries. |
| `GET`  | `/api/v1/tax-default-accounts/:sourceKey`   | Single tax with posting accounts and company default chart account summaries.       |

## Generic Lookup Filters

`GET /api/v1/tax` and `GET /api/v1/tax-default-accounts` accept:

- `page`
- `limit`
- `query`
- `transactionType`
- `taxType`
- `taxCode`
- `officialAtcCode`
- `status`
- `taxExempt`
- `sortBy`
- `sortDirection`

Common examples:

```http
GET /api/v1/tax?transactionType=Sales&taxType=OUTPUT VAT
GET /api/v1/tax?transactionType=Importation&taxType=INPUT VAT
GET /api/v1/tax?transactionType=Purchases&taxType=INPUT VAT
GET /api/v1/tax?taxType=INPUT VAT
```

## Dedicated Default Account Option Lookups

Use `GET /api/v1/tax/default-account-options` for repeated frontend dropdowns that need both tax details and default account titles.

Supported `classification` values:

| Classification      | Label                             | Filter                                         |
| ------------------- | --------------------------------- | ---------------------------------------------- |
| `output-sales`      | Output and Sales                  | `Sales` + `OUTPUT VAT`                         |
| `input-importation` | Input and Importation             | `Importation` + `INPUT VAT`                    |
| `input-purchases`   | Input and Purchases               | `Purchases` + `INPUT VAT`                      |
| `input-all`         | Input and All Types               | all `INPUT VAT` rows                           |
| `purchase-ewt`      | Purchase Expanded Withholding Tax | `Purchases` + `EWT`                            |
| `purchase-fwt`      | Purchase Final Withholding Tax    | `Purchases` + `FWT`                            |
| `purchase-wvat`     | Purchase VAT Withholding          | `Purchases` + `EWT` or `WVAT`, ATC prefix `WV` |
| `sales-cwt`         | Sales Creditable Withholding Tax  | `Sales` + `CWT`                                |
| `sales-wvat`        | Sales VAT Withholding             | `Sales` + `WVAT`                               |

Example:

```http
GET /api/v1/tax/default-account-options?classification=purchase-ewt
```

Returns:

```json
{
  "companyId": 11,
  "groups": [
    {
      "classification": "purchase-ewt",
      "label": "Purchase Expanded Withholding Tax",
      "options": [
        {
          "sourceKey": "PH-TAX-0092",
          "transactionType": "Purchases",
          "taxType": "EWT",
          "taxCode": "WC 160",
          "displayCode": "WC 160",
          "taxDescription": "WC 160 | Income Payment Made by Top Withholding Agents to Their Local/Resident Supplier of Services",
          "natureOfIncome": "Income Payment Made by Top Withholding Agents to Their Local/Resident Supplier of Services",
          "taxRate": "2",
          "taxExempt": false,
          "defaultAccountRole": "EXPANDED_WITHHOLDING_TAX_ACCOUNT",
          "defaultAccountCode": "2010002002",
          "defaultAccountTitle": "Expanded Withholding Tax",
          "status": "ACTIVE"
        }
      ]
    }
  ],
  "options": [
    {
      "sourceKey": "PH-TAX-0092",
      "displayCode": "WC 160",
      "defaultAccountTitle": "Expanded Withholding Tax"
    }
  ]
}
```

`groups[].options` is the preferred shape for UI code. `options` is the flattened list across returned groups.

## Frontend Usage Rules

- Party Management should use `GET /api/v1/tax/default-account-options` for party default tax dropdowns.
- Cash Disbursement should use `input-purchases` for purchase VAT options and `purchase-ewt` for EWT options.
- Do not add hardcoded VAT/EWT mock rows in frontend constants or data files.
- Preserve `sourceKey` for saved defaults. Use `taxCode` or `displayCode` only as the visible dropdown value when the existing UI contract requires it.
- When default account labels are needed, read `defaultAccountTitle` from the API response.

## OpenAPI and Orval

The controller must keep `@ApiOperation` and `@ApiOkResponse` metadata for every tax endpoint. Response DTOs live in `src/modules/tax/dto/tax-response.dto.ts`.

After backend route or DTO changes:

```bash
npm run openapi:generate
```

Then regenerate the frontend client from `gr8bookslite-frontend`:

```bash
npm run api:generate
```

## Testing

Primary unit coverage lives in `src/modules/tax/tax.service.spec.ts`.

Tests should verify:

- generic tax filtering and response mapping;
- default account resolution through `TaxPostingRule` and `CompanyAccountMapping`;
- dedicated classification groups;
- missing mapping behavior, where tax options stay visible and account fields become `null`;
- active company requirement;
- non-super-admin membership checks;
- source-key not-found behavior.

## Maintenance Notes

- Add new repeated-use tax dropdown needs to `TaxDefaultAccountOptionGroups` in `tax.service.ts`.
- Add new valid classification values to `TaxDefaultAccountOptionClassifications`.
- Keep tax definitions global. Do not add company chart account IDs to `Tax`.
- Keep default account titles coming from `ChartAccount` through `CompanyAccountMapping`.
- Regenerate OpenAPI and Orval whenever route or DTO shape changes.
