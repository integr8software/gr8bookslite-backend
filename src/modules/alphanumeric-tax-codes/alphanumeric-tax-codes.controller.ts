import { Controller, Get, Param, Query } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { AlphanumericTaxCodesService } from './alphanumeric-tax-codes.service';
import { AlphanumericTaxCodeListQueryDto } from './dto/alphanumeric-tax-code-list-query.dto';

@Public()
@SkipThrottle()
@Controller({
  version: '1',
})
export class AlphanumericTaxCodesController {
  constructor(
    private readonly alphanumericTaxCodesService: AlphanumericTaxCodesService,
  ) {}

  @Get('alphanumeric-tax-codes')
  listTaxCodes(@Query() query: AlphanumericTaxCodeListQueryDto) {
    return this.alphanumericTaxCodesService.listTaxCodes(query);
  }

  @Get('alphanumeric-tax-codes/autocomplete')
  listAutocomplete(@Query() query: AlphanumericTaxCodeListQueryDto) {
    return this.alphanumericTaxCodesService.listAutocomplete(query);
  }

  @Get('alphanumeric-tax-codes/transaction-types')
  listTransactionTypes() {
    return this.alphanumericTaxCodesService.listTransactionTypes();
  }

  @Get('alphanumeric-tax-codes/tax-types')
  listTaxTypes() {
    return this.alphanumericTaxCodesService.listTaxTypes();
  }

  @Get('alphanumeric-tax-codes/:sourceKey')
  getTaxCode(@Param('sourceKey') sourceKey: string) {
    return this.alphanumericTaxCodesService.getTaxCode(sourceKey);
  }
}
