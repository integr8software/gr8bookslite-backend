# Company Base Currency Runtime Adoption

## Scope

Company country and base currency are established during onboarding and stored on
`Company.countryCode` and `Company.baseCurrencyCode`. This phase applies that
company setting to the completed backend accounting paths: Accounts Payable
Voucher (APV) and bank-account/Chart of Accounts synchronization.

Billing currencies remain separate. PayMongo plan, invoice, and payment currency
continue to use the billing plan/payment configuration and are not replaced with a
company accounting currency.

## What Changed

- Added a small shared `CompanyCurrencyService` for reading the active company's
  saved base currency. It accepts an optional Prisma transaction client so reads
  can participate in the caller's transaction.
- Added `countryCode` and `baseCurrencyCode` to each company entry returned by the
  authentication profile, so frontend transaction forms do not need a separate
  company request.
- APV now falls back to the company's base currency when the request omits its
  currency value.
- APV's frontend defaults new vouchers to the active company's base currency.
- APV exchange-rate lookup now converts the selected transaction currency to the
  active company's base currency instead of always targeting PHP.
- The APV currency dropdown includes the company's base currency when it is not
  part of the legacy local option list.
- Bank Masterfile/Chart of Accounts linked-pair validation now compares foreign
  currency exchange-rate requirements with the company's configured base
  currency instead of a hardcoded `PHP` value. A bank account in the company's
  base currency does not require an exchange rate; a different bank currency
  still does.

## Existing Modules

An audit found that APV is currently the only completed backend transaction module
that persists a transaction header, detail, and journal currency plus exchange
rate. Bank Masterfile/Chart of Accounts synchronization is also a company-scoped
accounting validation path and is now base-currency aware. Other currency
references belong to billing, onboarding plan pricing, or frontend transaction
work that does not yet have an equivalent backend persistence flow. They should
be migrated when their backend transaction APIs are completed.

## Compatibility

- Existing companies have database defaults of `PH` and `PHP` from the onboarding
  migration, so existing APV behavior remains PHP unless a company was assigned a
  different base currency during onboarding.
- Existing APV records retain their stored currency and exchange rate when viewed
  or edited; the company base currency is only a default for new vouchers.
- Users can still select another transaction currency. Existing APV accounting
  validation continues to require the header, detail rows, and journal rows to use
  the same currency and exchange rate.
- The authentication response only gains optional company metadata fields and no
  existing response fields are removed.

## Follow-up

When another backend transaction module is completed, it should use the same
company base-currency context for its new-record default and rate target. Billing
and subscription currency must remain independent until a separate accounting
policy explicitly connects them.
