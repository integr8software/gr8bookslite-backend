import { BadRequestException } from '@nestjs/common';
import { ReferenceService } from './reference.service';

describe('ReferenceService', () => {
  const service = new ReferenceService();

  it('returns the supported country and currency references', () => {
    const countries = service.listCountries().countries;
    const currencies = service.listCurrencies().currencies;

    expect(countries.find((country) => country.code === 'PH')).toMatchObject({
      name: 'Philippines',
      defaultCurrencyCode: 'PHP',
    });
    expect(currencies.some((currency) => currency.code === 'USD')).toBe(true);
  });

  it('normalizes and validates company country and base currency codes', () => {
    expect(service.validateCompanyCurrency('ph', 'php')).toEqual({
      countryCode: 'PH',
      baseCurrencyCode: 'PHP',
    });
  });

  it('rejects unknown country or currency codes', () => {
    expect(() => service.validateCompanyCurrency('XX', 'PHP')).toThrow(
      BadRequestException,
    );
    expect(() => service.validateCompanyCurrency('PH', 'XXX')).toThrow(
      BadRequestException,
    );
  });
});
