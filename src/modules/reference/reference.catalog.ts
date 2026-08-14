export type CurrencyReference = {
  code: string;
  name: string;
  symbol: string;
};

export type CountryReference = {
  code: string;
  name: string;
  defaultCurrencyCode: string;
};

// Keep this catalog centralized so onboarding and future company settings use
// the same codes without creating a second frontend-only source of truth.
export const CURRENCY_REFERENCES: readonly CurrencyReference[] = [
  { code: 'AED', name: 'United Arab Emirates Dirham', symbol: 'د.إ' },
  { code: 'AUD', name: 'Australian Dollar', symbol: '$' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: '$' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: '$' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: '$' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿' },
  { code: 'USD', name: 'United States Dollar', symbol: '$' },
  { code: 'VND', name: 'Vietnamese Dong', symbol: '₫' },
] as const;

export const COUNTRY_REFERENCES: readonly CountryReference[] = [
  { code: 'AE', name: 'United Arab Emirates', defaultCurrencyCode: 'AED' },
  { code: 'AU', name: 'Australia', defaultCurrencyCode: 'AUD' },
  { code: 'BR', name: 'Brazil', defaultCurrencyCode: 'BRL' },
  { code: 'CA', name: 'Canada', defaultCurrencyCode: 'CAD' },
  { code: 'CH', name: 'Switzerland', defaultCurrencyCode: 'CHF' },
  { code: 'CN', name: 'China', defaultCurrencyCode: 'CNY' },
  { code: 'DE', name: 'Germany', defaultCurrencyCode: 'EUR' },
  { code: 'ES', name: 'Spain', defaultCurrencyCode: 'EUR' },
  { code: 'FR', name: 'France', defaultCurrencyCode: 'EUR' },
  { code: 'GB', name: 'United Kingdom', defaultCurrencyCode: 'GBP' },
  { code: 'HK', name: 'Hong Kong', defaultCurrencyCode: 'HKD' },
  { code: 'ID', name: 'Indonesia', defaultCurrencyCode: 'IDR' },
  { code: 'IN', name: 'India', defaultCurrencyCode: 'INR' },
  { code: 'IT', name: 'Italy', defaultCurrencyCode: 'EUR' },
  { code: 'JP', name: 'Japan', defaultCurrencyCode: 'JPY' },
  { code: 'KR', name: 'South Korea', defaultCurrencyCode: 'KRW' },
  { code: 'MY', name: 'Malaysia', defaultCurrencyCode: 'MYR' },
  { code: 'PH', name: 'Philippines', defaultCurrencyCode: 'PHP' },
  { code: 'SA', name: 'Saudi Arabia', defaultCurrencyCode: 'SAR' },
  { code: 'SG', name: 'Singapore', defaultCurrencyCode: 'SGD' },
  { code: 'TH', name: 'Thailand', defaultCurrencyCode: 'THB' },
  { code: 'US', name: 'United States', defaultCurrencyCode: 'USD' },
  { code: 'VN', name: 'Vietnam', defaultCurrencyCode: 'VND' },
] as const;
