# Tax Default Account API

## Purpose

Use this API when a caller needs tax codes together with the active company's default Chart of Accounts posting account for each tax posting rule.

The standard tax endpoints return authenticated tax reference data only. They do not resolve company-specific posting accounts unless the caller uses the default-account endpoints below. Repeated frontend dropdowns should use the dedicated default-account option route so tax groups and account titles stay owned by the backend.

All tax endpoints are authenticated. `TaxController` is guarded with `JwtAuthGuard`, and `TaxModule` imports `AuthModule` plus `AccessControlModule` for the guard dependencies. No tax lookup, autocomplete, metadata, source-key, or default-account endpoint should be marked `@Public()`.

## Endpoints

### `GET /api/v1/tax/default-account-options`

Returns dedicated repeated-use tax option groups with default account titles.

Authentication is required. The company is resolved from the authenticated user's active `companyId`.

Optional query:

- `classification`

Supported classifications:

| Classification      | Label                             | Backing Filter                                                                         |
| ------------------- | --------------------------------- | -------------------------------------------------------------------------------------- |
| `output-sales`      | Output and Sales                  | `transactionType = Sales`, `taxType = OUTPUT VAT`                                      |
| `input-importation` | Input and Importation             | `transactionType = Importation`, `taxType = INPUT VAT`                                 |
| `input-purchases`   | Input and Purchases               | `transactionType = Purchases`, `taxType = INPUT VAT`                                   |
| `input-all`         | Input and All Types               | `taxType = INPUT VAT`                                                                  |
| `purchase-ewt`      | Purchase Expanded Withholding Tax | `transactionType = Purchases`, `taxType = EWT`                                         |
| `purchase-fwt`      | Purchase Final Withholding Tax    | `transactionType = Purchases`, `taxType = FWT`                                         |
| `purchase-wvat`     | Purchase VAT Withholding          | `transactionType = Purchases`, `taxType in EWT/WVAT`, `officialAtcCode starts with WV` |
| `sales-cwt`         | Sales Creditable Withholding Tax  | `transactionType = Sales`, `taxType = CWT`                                             |
| `sales-wvat`        | Sales VAT Withholding             | `transactionType = Sales`, `taxType = WVAT`                                            |

Example:

```http
GET /api/v1/tax/default-account-options?classification=purchase-ewt
```

### `GET /api/v1/tax-default-accounts`

Returns tax codes with resolved company default tax posting accounts.

Authentication is required. The company is resolved from the authenticated user's active `companyId`.

Query parameters are the same as `GET /api/v1/tax`:

- `query`
- `transactionType`
- `taxType`
- `taxCode`
- `officialAtcCode`
- `status`
- `taxExempt`
- `sortBy`
- `sortDirection`
- `limit`

### `GET /api/v1/tax-default-accounts/:sourceKey`

Returns one tax code with resolved company default tax posting accounts.

Authentication is required. The company is resolved from the authenticated user's active `companyId`.

Related authenticated reference endpoints:

- `GET /api/v1/tax`
- `GET /api/v1/tax/autocomplete`
- `GET /api/v1/tax/transaction-types`
- `GET /api/v1/tax/tax-types`
- `GET /api/v1/tax/party-default-classifications`
- `GET /api/v1/tax/:sourceKey`

## Response Shape

Default account option response:

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
```

Use `groups` when a screen needs named option groups. Use `options` when a caller requested one classification and wants a flat list.

List response:

```json
{
  "companyId": 1,
  "taxCodes": [
    {
      "id": 1,
      "sourceKey": "PURCHASE_INPUT_VAT_12",
      "transactionType": "Purchases",
      "taxType": "INPUT VAT",
      "taxCode": "IV12",
      "taxDescription": "Input VAT 12%",
      "taxRate": "12.0000",
      "taxExempt": false,
      "taxAlias": null,
      "atc": null,
      "officialAtcCode": null,
      "natureOfIncome": null,
      "sortOrder": 100,
      "status": "ACTIVE",
      "postingAccounts": [
        {
          "transactionScope": "PURCHASE",
          "postingEvent": "RECOGNITION",
          "accountRole": "INPUT_TAX_ACCOUNT",
          "entrySide": "DEBIT",
          "amountSource": "TAX_AMOUNT",
          "priority": 100,
          "companyAccountMappingId": "15",
          "chartAccount": {
            "id": "101",
            "accountCode": "2010002011",
            "accountTitle": "Input VAT",
            "accountType": "LIABILITY",
            "accountNature": "DEBIT",
            "status": "ACTIVE",
            "isPostingAccount": true
          }
        }
      ],
      "defaultTaxAccounts": [
        {
          "transactionScope": "PURCHASE",
          "postingEvent": "RECOGNITION",
          "accountRole": "INPUT_TAX_ACCOUNT",
          "entrySide": "DEBIT",
          "amountSource": "TAX_AMOUNT",
          "priority": 100,
          "companyAccountMappingId": "15",
          "chartAccount": {
            "id": "101",
            "accountCode": "2010002011",
            "accountTitle": "Input VAT",
            "accountType": "LIABILITY",
            "accountNature": "DEBIT",
            "status": "ACTIVE",
            "isPostingAccount": true
          }
        }
      ]
    }
  ],
  "taxes": []
}
```

`taxCodes` and `taxes` contain the same array for compatibility with existing tax responses. `postingAccounts` and `defaultTaxAccounts` also contain the same array; prefer `postingAccounts` for new code.

Single response:

```json
{
  "companyId": 1,
  "tax": {},
  "taxCode": {}
}
```

`tax` and `taxCode` contain the same object for compatibility.

## Resolution Logic

The service resolves accounts in this order:

1. Read active `TaxPostingRule` rows for each tax code using `postingEvent = RECOGNITION`.
2. Use each rule's `accountRole`.
3. Find the active company's `CompanyAccountMapping` row where `moduleCode = TXM` and `accountRole` matches the posting rule.
4. Return the mapped `ChartAccount` summary.

If a posting rule exists but the company mapping is missing, the rule is still returned and `chartAccount` is `null`. This makes missing bootstrap data visible to the caller instead of hiding the tax code.

## Seeded TXM Roles

Company bootstrap seeds these TXM posting mappings:

| Role                                 | Default Account Code | Default Account Title      |
| ------------------------------------ | -------------------- | -------------------------- |
| `INPUT_TAX_ACCOUNT`                  | `2010002011`         | Input VAT                  |
| `OUTPUT_VAT_ACCOUNT`                 | `2010002005`         | Output VAT                 |
| `DEFERRED_VAT_ACCOUNT`               | `2010002004`         | Deferred VAT               |
| `EXPANDED_WITHHOLDING_TAX_ACCOUNT`   | `2010002002`         | Expanded Withholding Tax   |
| `CREDITABLE_WITHHOLDING_TAX_ACCOUNT` | `2010002001`         | Creditable Withholding Tax |
| `WITHHOLDING_VATABLE_TAX_ACCOUNT`    | `2010002009`         | Withholding VAT            |
| `FINAL_WITHHOLDING_TAX_ACCOUNT`      | `2010002003`         | Final Withholding Tax      |

## Frontend Lookup Rules

- Use `GET /api/v1/tax/default-account-options` for repeated selector groups.
- Use `input-purchases` for purchase VAT dropdowns in Cash Disbursement.
- Use `purchase-ewt` for EWT dropdowns in Cash Disbursement.
- Use `output-sales`, `sales-cwt`, and `sales-wvat` for sales-side defaults.
- Do not hardcode VAT/EWT/CWT/WVAT option rows in frontend mock data.
- Read `defaultAccountTitle` from the API when a UI or generated accounting row needs the tax account title.

## OpenAPI and Generated Client

All tax routes must have Swagger response DTOs so Orval generates typed frontend functions instead of `void`.

After changing routes or response shapes:

```bash
npm run openapi:generate
```

Then from `gr8bookslite-frontend`:

```bash
npm run api:generate
```

## Files

- Controller: `src/modules/tax/tax.controller.ts`
- Module: `src/modules/tax/tax.module.ts`
- Service: `src/modules/tax/tax.service.ts`
- Prisma payload types: `src/modules/tax/types/tax-prisma-payload.type.ts`
- Tax posting rule seed: `src/modules/tax/seed/tax.seed.ts`
- Company TXM mapping seed: `src/modules/maintenance/chart-of-accounts/seed/chart-of-accounts.seed.ts`
- Standard TXM mapping definitions: `src/modules/maintenance/chart-of-accounts/seed/chart-of-accounts-system-groups.seed.ts`
