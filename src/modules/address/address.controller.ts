import { Controller, Get, Param, Query } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { AddressService } from './address.service';
import { AddressAutocompleteQueryDto } from './dto/address-autocomplete-query.dto';
import { BarangayListQueryDto } from './dto/barangay-list-query.dto';

@Public()
@SkipThrottle()
@Controller({
  version: '1',
})
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @Get('regions')
  listRegions() {
    return this.addressService.listRegions();
  }

  @Get('regions/:regionCode')
  getRegion(@Param('regionCode') regionCode: string) {
    return this.addressService.getRegion(regionCode);
  }

  @Get('regions/:regionCode/provinces')
  listRegionProvinces(@Param('regionCode') regionCode: string) {
    return this.addressService.listProvinces(regionCode);
  }

  @Get('regions/:regionCode/districts')
  listRegionDistricts() {
    return this.addressService.emptyDistricts();
  }

  @Get('regions/:regionCode/cities')
  listRegionCities(@Param('regionCode') regionCode: string) {
    return this.addressService.listCityMunicipalities({ regionCode });
  }

  @Get('regions/:regionCode/municipalities')
  listRegionMunicipalities(@Param('regionCode') regionCode: string) {
    return this.addressService.listCityMunicipalities({ regionCode });
  }

  @Get('regions/:regionCode/cities-municipalities')
  listRegionCitiesMunicipalities(@Param('regionCode') regionCode: string) {
    return this.addressService.listCityMunicipalities({ regionCode });
  }

  @Get('regions/:regionCode/sub-municipalities')
  listRegionSubMunicipalities() {
    return this.addressService.emptySubMunicipalities();
  }

  @Get('regions/:regionCode/barangays')
  listRegionBarangays(@Param('regionCode') regionCode: string) {
    return this.addressService.listBarangays({ regionCode });
  }

  @Get('provinces')
  listProvinces() {
    return this.addressService.listProvinces();
  }

  @Get('provinces/:provinceCode')
  getProvince(@Param('provinceCode') provinceCode: string) {
    return this.addressService.getProvince(provinceCode);
  }

  @Get('provinces/:provinceCode/cities')
  listProvinceCities(@Param('provinceCode') provinceCode: string) {
    return this.addressService.listCityMunicipalities({ provinceCode });
  }

  @Get('provinces/:provinceCode/municipalities')
  listProvinceMunicipalities(@Param('provinceCode') provinceCode: string) {
    return this.addressService.listCityMunicipalities({ provinceCode });
  }

  @Get('provinces/:provinceCode/cities-municipalities')
  listProvinceCitiesMunicipalities(
    @Param('provinceCode') provinceCode: string,
  ) {
    return this.addressService.listCityMunicipalities({ provinceCode });
  }

  @Get('provinces/:provinceCode/sub-municipalities')
  listProvinceSubMunicipalities() {
    return this.addressService.emptySubMunicipalities();
  }

  @Get('provinces/:provinceCode/barangays')
  listProvinceBarangays(@Param('provinceCode') provinceCode: string) {
    return this.addressService.listBarangays({ provinceCode });
  }

  @Get('cities-municipalities')
  listCitiesMunicipalities() {
    return this.addressService.listCityMunicipalities({});
  }

  @Get('cities-municipalities/:cityMunicipalityCode')
  getCityMunicipality(
    @Param('cityMunicipalityCode') cityMunicipalityCode: string,
  ) {
    return this.addressService.getCityMunicipality(cityMunicipalityCode);
  }

  @Get('cities-municipalities/:cityMunicipalityCode/barangays')
  listCityMunicipalityBarangays(
    @Param('cityMunicipalityCode') cityMunicipalityCode: string,
  ) {
    return this.addressService.listBarangays({ cityMunicipalityCode });
  }

  @Get('barangays')
  listBarangays(@Query() query: BarangayListQueryDto) {
    return this.addressService.listBarangays(query);
  }

  @Get('address/autocomplete')
  listAutocomplete(@Query() query: AddressAutocompleteQueryDto) {
    return this.addressService.listAutocomplete(query);
  }
}
