# Tax Default Account API

## Purpose

Use this API when a caller needs tax codes together with the active company's default Chart of Accounts posting account for each tax posting rule.

The standard tax endpoints return authenticated tax reference data only. They do not resolve company-specific posting accounts unless the caller uses the default-account endpoints below.

All tax endpoints are authenticated. `TaxController` is guarded with `JwtAuthGuard`, and `TaxModule` imports `AuthModule` plus `AccessControlModule` for the guard dependencies. No tax lookup, autocomplete, metadata, source-key, or default-account endpoint should be marked `@Public()`.

## Endpoints

### `GET /v1/tax-default-accounts`

Returns tax codes with resolved company default tax posting accounts.

Authentication is required. The company is resolved from the authenticated user's active `companyId`.

Query parameters are the same as `GET /v1/tax`:

- `query`
- `transactionType`
- `taxType`
- `taxCode`
- `officialAtcCode`
- `status`
- `taxExempt`
- `limit`

### `GET /v1/tax-default-accounts/:sourceKey`

Returns one tax code with resolved company default tax posting accounts.

Authentication is required. The company is resolved from the authenticated user's active `companyId`.

Related authenticated reference endpoints:

- `GET /v1/tax`
- `GET /v1/tax/autocomplete`
- `GET /v1/tax/transaction-types`
- `GET /v1/tax/tax-types`
- `GET /v1/tax/party-default-classifications`
- `GET /v1/tax/:sourceKey`

## Response Shape

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
            "accountTitle": "Input Tax",
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
            "accountTitle": "Input Tax",
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

- `INPUT_TAX_ACCOUNT`
- `OUTPUT_VAT_ACCOUNT`
- `DEFERRED_VAT_ACCOUNT`
- `EXPANDED_WITHHOLDING_TAX_ACCOUNT`
- `CREDITABLE_WITHHOLDING_TAX_ACCOUNT`
- `WITHHOLDING_VATABLE_TAX_ACCOUNT`
- `FINAL_WITHHOLDING_TAX_ACCOUNT`

## Files

- Controller: `src/modules/tax/tax.controller.ts`
- Module: `src/modules/tax/tax.module.ts`
- Service: `src/modules/tax/tax.service.ts`
- Prisma payload types: `src/modules/tax/types/tax-prisma-payload.type.ts`
- Tax posting rule seed: `src/modules/tax/seed/tax.seed.ts`
- Company TXM mapping seed: `src/modules/maintenance/chart-of-accounts/seed/chart-of-accounts.seed.ts`
- Standard TXM mapping definitions: `src/modules/maintenance/chart-of-accounts/seed/chart-of-accounts-system-groups.seed.ts`
