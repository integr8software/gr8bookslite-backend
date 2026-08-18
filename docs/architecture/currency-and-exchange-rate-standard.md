# Currency and Exchange Rate Standard

## Purpose

Use this document when creating or modifying any module that has a Currency field, Exchange Rate field, base currency behavior, or currency setup workflow.

The goal is to keep currency options and exchange-rate resolution consistent across onboarding, company management, multi-currency setup, and transaction modules.

## Canonical Sources

Stable currency identity and persistence validation:

- Backend catalog: `src/modules/reference/reference.catalog.ts`
- Backend API: `GET /api/v1/reference/currencies`
- Frontend reference API: `app/src/services/shared/reference/ReferenceApi.ts`
- Frontend reference hook: `app/src/hooks/onboarding/useOnboardingReferenceData.ts`

Company accounting base currency:

- Database field: `Company.baseCurrencyCode`
- Country field: `Company.countryCode`
- Country only suggests a default currency. It does not restrict the user's selected accounting base currency.

Live exchange-rate source:

- Frontend BFF route: `app/api/exchange-rates/route.ts`
- Frontend API wrapper: `app/src/services/modules/system-administration/multi-currency-setup/MultiCurrencySetupService.ts`
- Shared frontend currency helpers: `app/src/data/shared/currency/CurrencyOptionsData.ts`

Billing currency is separate:

- Subscription, PayMongo, invoice, and payment currency must continue to use billing configuration.
- Do not couple accounting base currency to subscription billing currency.

## Required Architecture

Preferred flow:

```text
Country Reference
        |
        | suggests default only
        v
Company.baseCurrencyCode
        |
        v
/api/exchange-rates?base=<Company.baseCurrencyCode>
        |
        v
MultiCurrencyFetchedRate[]
        |
        +--> Onboarding Base Currency options
        +--> Edit Company Base Currency options
        +--> Multi-Currency Setup options and rates
        +--> Transaction Currency options and Exchange Rate
```

Stable currency references keep forms usable when live providers are temporarily unavailable.

Live providers are used for exchange-rate resolution and rate-supported metadata, not for deciding whether a company base currency can be persisted.

## Transaction Module Rules

For every transaction module with Currency and Exchange Rate:

1. Default Currency to the active company's `baseCurrencyCode`.
2. If selected Currency equals the company base currency, set Exchange Rate to `1`.
3. If selected Currency differs from the company base currency, resolve the rate through the shared exchange-rate API.
4. Use the same direction as Multi-Currency Setup:

```text
base = Company.baseCurrencyCode
target = selected transaction currency
```

5. Use the returned `exchangeRate` for the transaction exchange rate.
6. Do not fetch `base=<selected currency>` and then invert or search for the company base currency in a module-specific way.
7. Normalize currency codes to uppercase.
8. Do not expose obsolete or unsupported legacy codes from browser/runtime currency lists.

## Currency Option Rules

Do not create new hardcoded currency arrays for transaction modules.

Use centralized options:

- Stable references from the Reference API.
- Live rate results from `/api/exchange-rates`.
- Shared frontend helper `createCurrencyCatalogFromReferencesAndRates(...)`.

Allowed fallback:

- Use the stable centralized catalog when live rates are unavailable.
- Keep the currently saved currency visible when editing an existing record, even if live providers are down.

Not allowed:

- `Intl.supportedValuesOf("currency")` as a module option source.
- Module-local arrays like `["PHP", "USD", "EUR", "JPY"]` for new currency fields.
- Adding another exchange-rate route or service that duplicates `app/api/exchange-rates/route.ts`.
- Hardcoding PHP behavior except as a safe fallback for legacy companies without a saved base currency.

## Existing Exchange-Rate API Behavior

The existing BFF route supports:

- BSP RERB as primary source.
- Frankfurter fallback.
- Open ER API fallback.
- Arbitrary base currency through `?base=PHP`, `?base=USD`, `?base=BRL`, etc.
- Base currency rate of `1`.
- Provider currency names and symbols.
- BSP PHP-equivalent conversion into direct `base -> target` rates.
- Direct provider rates from fallback APIs.

Returned rate shape:

```ts
type MultiCurrencyFetchedRate = {
  baseCurrencyCode: string;
  targetCurrencyCode: string;
  targetCurrencyName?: string;
  targetCurrencySymbol?: string;
  exchangeRate: number;
  inverseExchangeRate: number;
  rateAsOf: string;
  source?: string;
};
```

The same base, target, and rate date must produce the same effective rate in Multi-Currency Setup and transaction modules.

## Onboarding and Edit Company Rules

Onboarding and Workspace > Company Management > Edit Company must:

- Load countries from the Reference API.
- Load base currency options from the shared currency architecture.
- Display the saved `countryCode` and `baseCurrencyCode`.
- Suggest the country's default currency only while the user has not manually changed Base Currency.
- Allow Base Currency to differ from the country's default.
- Persist `Company.countryCode` and `Company.baseCurrencyCode` through the existing company save flow.

Do not make onboarding or company edit unusable just because BSP, Frankfurter, or Open ER API is unavailable.

## Review Checklist

Before completing a new currency-aware module:

- Public API uses `Company.baseCurrencyCode` as accounting base currency.
- Currency options come from the shared reference/rate architecture.
- Base currency sets exchange rate to `1`.
- Foreign currency resolves through `/api/exchange-rates?base=<company base currency>`.
- The module uses `exchangeRate` from `MultiCurrencyFetchedRate`.
- No module-specific exchange-rate fetcher or inversion logic was added.
- No new hardcoded currency array was added.
- Billing currency was not changed.
- Unsupported legacy codes such as `ITL` cannot appear in new dropdowns.
- Focused tests or verification cover base currency, foreign currency, fallback behavior, and unsupported currency handling where practical.

## Known Migration Notes

Some older frontend modules still have local currency arrays. When touching those modules, replace the local array with the shared currency option source as part of the same change.

Do not refactor every transaction module solely to chase this standard. Apply it when a module is created, when currency behavior is added, or when an existing currency bug is fixed.
