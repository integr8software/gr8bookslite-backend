import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AddressAutocompleteQueryDto } from './dto/address-autocomplete-query.dto';
import { BarangayListQueryDto } from './dto/barangay-list-query.dto';
import { mapAddressAutocomplete, mapBarangay, mapCityMunicipality, mapProvince, mapRegion } from './mappers/address.mapper';
import type { AddressAutocompleteRow } from './types/address-autocomplete-row.type';
import type { AddressNameResolutionInput, AddressNameResolutionResult } from './types/address-name-resolution.type';

@Injectable()
export class AddressService {
  constructor(private readonly prisma: PrismaService) {}

  async listRegions() {
    const regions = await this.prisma.region.findMany({
      orderBy: [{ code: 'asc' }],
    });

    return {
      regions: regions.map(mapRegion),
    };
  }

  async getRegion(regionCode: string) {
    const region = await this.prisma.region.findUnique({
      where: {
        code: regionCode,
      },
    });

    if (!region) {
      throw new NotFoundException('Region not found.');
    }

    return {
      region: mapRegion(region),
    };
  }

  async listProvinces(regionCode?: string) {
    const provinces = await this.prisma.province.findMany({
      where: regionCode ? { regionCode } : undefined,
      orderBy: [{ name: 'asc' }],
    });

    return {
      provinces: provinces.map(mapProvince),
    };
  }

  async getProvince(provinceCode: string) {
    const province = await this.prisma.province.findUnique({
      where: {
        code: provinceCode,
      },
    });

    if (!province) {
      throw new NotFoundException('Province not found.');
    }

    return {
      province: mapProvince(province),
    };
  }

  async listCityMunicipalities(filters: { regionCode?: string; provinceCode?: string }) {
    const cityMunicipalities = await this.prisma.cityMunicipality.findMany({
      where: {
        regionCode: filters.regionCode,
        provinceCode: filters.provinceCode,
      },
      orderBy: [{ name: 'asc' }],
    });

    return {
      cityMunicipalities: cityMunicipalities.map(mapCityMunicipality),
    };
  }

  async getCityMunicipality(cityMunicipalityCode: string) {
    const cityMunicipality = await this.prisma.cityMunicipality.findUnique({
      where: {
        code: cityMunicipalityCode,
      },
    });

    if (!cityMunicipality) {
      throw new NotFoundException('City/municipality not found.');
    }

    return {
      cityMunicipality: mapCityMunicipality(cityMunicipality),
    };
  }

  async listBarangays(query: BarangayListQueryDto = {}) {
    const barangays = await this.prisma.barangay.findMany({
      where: {
        regionCode: query.regionCode,
        provinceCode: query.provinceCode,
        cityMunicipalityCode: query.cityMunicipalityCode,
      },
      orderBy: [{ name: 'asc' }],
    });

    return {
      barangays: barangays.map(mapBarangay),
    };
  }

  async listAutocomplete(query: AddressAutocompleteQueryDto) {
    const limit = query.limit ?? 20;
    const conditions: Prisma.Sql[] = [];
    const normalizedQuery = query.query?.trim().toLowerCase();

    if (normalizedQuery) {
      conditions.push(Prisma.sql`"search_text" LIKE ${`%${normalizedQuery}%`}`);
    }

    if (query.regionCode) {
      conditions.push(Prisma.sql`"region_code" = ${query.regionCode}`);
    }

    if (query.provinceCode) {
      conditions.push(Prisma.sql`"province_code" = ${query.provinceCode}`);
    }

    if (query.cityMunicipalityCode) {
      conditions.push(Prisma.sql`"city_municipality_code" = ${query.cityMunicipalityCode}`);
    }

    const whereClause = conditions.length > 0 ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}` : Prisma.empty;

    const rows = await this.prisma.$queryRaw<AddressAutocompleteRow[]>`
      SELECT
        "barangay_code",
        "barangay_name",
        "city_municipality_code",
        "city_municipality_name",
        "province_code",
        "province_name",
        "region_code",
        "region_name",
        "label"
      FROM "address_autocomplete_view"
      ${whereClause}
      ORDER BY "region_name" ASC, "province_name" ASC, "city_municipality_name" ASC, "barangay_name" ASC
      LIMIT ${limit}
    `;

    return {
      addresses: rows.map(mapAddressAutocomplete),
    };
  }

  async resolveNames(input: AddressNameResolutionInput): Promise<AddressNameResolutionResult | null> {
    const barangay = this.normalizeLookupText(input.barangay);
    const cityMunicipality = this.normalizeLookupText(input.cityMunicipality);
    const province = this.normalizeLookupText(input.province);

    const rows = await this.prisma.$queryRaw<AddressAutocompleteRow[]>`
      SELECT
        "barangay_code",
        "barangay_name",
        "city_municipality_code",
        "city_municipality_name",
        "province_code",
        "province_name",
        "region_code",
        "region_name",
        "label"
      FROM "address_autocomplete_view"
      WHERE LOWER(TRIM("barangay_name")) = ${barangay}
        AND LOWER(TRIM("city_municipality_name")) = ${cityMunicipality}
        AND LOWER(TRIM("province_name")) = ${province}
      ORDER BY "region_name" ASC, "province_name" ASC, "city_municipality_name" ASC, "barangay_name" ASC
      LIMIT 2
    `;

    if (rows.length === 0) {
      return null;
    }

    if (rows.length > 1) {
      throw new BadRequestException('Address is ambiguous. Select the address from the address reference list.');
    }

    return mapAddressAutocomplete(rows[0]);
  }

  emptyDistricts() {
    return {
      districts: [],
    };
  }

  emptySubMunicipalities() {
    return {
      subMunicipalities: [],
    };
  }

  private normalizeLookupText(value: string) {
    return value.trim().replace(/\s+/g, ' ').toLowerCase();
  }
}
