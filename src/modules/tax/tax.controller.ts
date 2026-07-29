import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TaxListQueryDto } from './dto/tax-list-query.dto';
import { TaxService } from './tax.service';

@SkipThrottle()
@UseGuards(JwtAuthGuard)
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

  @Get('tax-default-accounts')
  listTaxesWithDefaultAccounts(@CurrentUser() user: AuthUser, @Query() query: TaxListQueryDto) {
    return this.taxService.listTaxesWithDefaultAccounts(user, query);
  }

  @Get('tax-default-accounts/:sourceKey')
  getTaxWithDefaultAccounts(@CurrentUser() user: AuthUser, @Param('sourceKey') sourceKey: string) {
    return this.taxService.getTaxWithDefaultAccounts(user, sourceKey);
  }

  @Get('tax/:sourceKey')
  getTax(@Param('sourceKey') sourceKey: string) {
    return this.taxService.getTax(sourceKey);
  }
}
