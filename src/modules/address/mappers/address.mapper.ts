import type { Barangay, CityMunicipality, Province, Region } from '@prisma/client';
import type { AddressAutocompleteRow } from '../types/address-autocomplete-row.type';

export function mapRegion(region: Region) {
  return {
    id: region.id,
    psgcCode: region.psgcCode,
    regionCode: region.code,
    name: region.name,
  };
}

export function mapProvince(province: Province) {
  return {
    id: province.id,
    psgcCode: province.psgcCode,
    provinceCode: province.code,
    regionCode: province.regionCode,
    name: province.name,
  };
}

export function mapCityMunicipality(cityMunicipality: CityMunicipality) {
  return {
    id: cityMunicipality.id,
    psgcCode: cityMunicipality.psgcCode,
    cityMunicipalityCode: cityMunicipality.code,
    regionCode: cityMunicipality.regionCode,
    provinceCode: cityMunicipality.provinceCode,
    name: cityMunicipality.name,
  };
}

export function mapBarangay(barangay: Barangay) {
  return {
    id: barangay.id,
    psgcCode: barangay.psgcCode,
    barangayCode: barangay.code,
    regionCode: barangay.regionCode,
    provinceCode: barangay.provinceCode,
    cityMunicipalityCode: barangay.cityMunicipalityCode,
    name: barangay.name,
  };
}

export function mapAddressAutocomplete(row: AddressAutocompleteRow) {
  return {
    label: row.label,
    barangay: {
      code: row.barangay_code,
      name: row.barangay_name,
    },
    cityMunicipality: {
      code: row.city_municipality_code,
      name: row.city_municipality_name,
    },
    province: {
      code: row.province_code,
      name: row.province_name,
    },
    region: {
      code: row.region_code,
      name: row.region_name,
    },
  };
}
