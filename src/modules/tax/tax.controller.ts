import { Controller, Get, Param, Query } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { TaxListQueryDto } from './dto/tax-list-query.dto';
import { TaxService } from './tax.service';

@Public()
@SkipThrottle()
@Controller({
  version: '1',
})
export class TaxController {
  constructor(private readonly taxService: TaxService) {}

  @Get('tax')
  listTaxes(@Query() query: TaxListQueryDto) {
    return this.taxService.listTaxes(query);
  }

  @Get('tax/autocomplete')
  listAutocomplete(@Query() query: TaxListQueryDto) {
    return this.taxService.listAutocomplete(query);
  }

  @Get('tax/transaction-types')
  listTransactionTypes() {
    return this.taxService.listTransactionTypes();
  }

  @Get('tax/tax-types')
  listTaxTypes() {
    return this.taxService.listTaxTypes();
  }

  @Get('tax/party-default-classifications')
  listPartyDefaultClassifications() {
    return this.taxService.listPartyDefaultClassifications();
  }

  @Get('tax/:sourceKey')
  getTax(@Param('sourceKey') sourceKey: string) {
    return this.taxService.getTax(sourceKey);
  }
}
