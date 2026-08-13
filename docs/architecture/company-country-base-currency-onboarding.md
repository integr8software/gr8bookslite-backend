# Company Country and Base Currency Onboarding

## Scope

This change adds the company's legal country and accounting base currency to the existing onboarding Company Details step. It establishes company identity and a single base currency for later multi-currency phases. It does not change transaction currency, exchange-rate calculation, enabled currencies, FX gain/loss, or reporting.

## Existing components reused

- Existing `OnboardingService.saveCompanyDetails()` transaction remains the single write path for company creation and update.
- Existing `UserOnboardingDraft.provisionedCompanyId` relation is used when reloading country and currency values; no duplicate draft columns were added.
- Existing onboarding form state, validation, draft restoration, BFF API client, and select-field components were extended.
- Existing Philippines address catalog remains unchanged. It is not a country catalog, so a small shared reference catalog was added for country and currency codes.
- Existing subscription plan currency remains billing currency metadata and was not reused as the company's accounting currency.

## Implementation

Backend:

- `Company.country_code` stores an ISO-style two-letter country code.
- `Company.base_currency_code` stores a three-letter ISO-style currency code.
- Both columns default existing and newly inserted rows to `PH` and `PHP` in the migration/schema.
- `ReferenceModule` exposes public reference endpoints:
  - `GET /api/v1/reference/countries`
  - `GET /api/v1/reference/currencies`
- `ReferenceService` validates that both submitted codes exist in the centralized catalog and normalizes them to uppercase.
- Onboarding validates and persists both values in the existing company transaction. Company setup defaults remain inside that same transaction.

Frontend:

- Onboarding loads countries and currencies through the BFF API client.
- Changing Country applies its catalog default currency only while the user has not manually selected a base currency.
- Changing Base Currency marks the selection as explicit for the current onboarding session.
- Country and Base Currency are submitted together with the existing company details request and shown on the review step.

## Compatibility

The migration supplies `PH` and `PHP` for existing companies, so existing records remain valid without a data backfill. Existing onboarding drafts remain readable because country and currency are read from their provisioned company. Drafts without a provisioned company use the frontend defaults until Company Details is saved.

The backend accepts a valid base currency that differs from the country's standard currency. This is intentional: the country suggestion is only a default, not an accounting restriction.

## Validation and transaction behavior

Country and base currency are required in the onboarding DTO. The country must exist in the country catalog and the base currency must exist in the currency catalog. The save remains atomic: if company creation/update or company setup seeding fails, the company and its country/base currency values roll back together. Logo storage remains an external operation and is not moved into the database transaction.

## Deployment

Local:

```bash
npm run db:migrate:local
npm run db:generate:local
npm run typecheck
npm test -- --runInBand
```

Shared development/staging should apply the committed migration through the normal deployment migration command before rebuilding the backend and frontend. No seed or provisioning command is required for the country/currency catalog because it is application reference data.

## Future phases

Later work can add company currency settings, transaction currency, exchange rates, conversion rules, and reporting behavior using `Company.baseCurrencyCode` as the source of truth. Those changes should not reinterpret subscription-plan billing currency or add transaction behavior to this phase.
