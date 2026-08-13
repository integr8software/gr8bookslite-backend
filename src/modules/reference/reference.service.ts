import { BadRequestException, Injectable } from '@nestjs/common';
import { COUNTRY_REFERENCES, CURRENCY_REFERENCES } from './reference.catalog';

@Injectable()
export class ReferenceService {
  listCountries() {
    return { countries: COUNTRY_REFERENCES };
  }

  listCurrencies() {
    return { currencies: CURRENCY_REFERENCES };
  }

  validateCompanyCurrency(countryCode: string, baseCurrencyCode: string) {
    const normalizedCountryCode = countryCode.trim().toUpperCase();
    const normalizedCurrencyCode = baseCurrencyCode.trim().toUpperCase();
    const country = COUNTRY_REFERENCES.find((reference) => reference.code === normalizedCountryCode);
    const currency = CURRENCY_REFERENCES.find((reference) => reference.code === normalizedCurrencyCode);

    if (!country) {
      throw new BadRequestException('Select a valid company country.');
    }

    if (!currency) {
      throw new BadRequestException('Select a valid base currency.');
    }

    return {
      countryCode: country.code,
      baseCurrencyCode: currency.code,
    };
  }
}
