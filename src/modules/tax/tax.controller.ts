import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TaxDefaultAccountOptionsQueryDto } from './dto/tax-default-account-options-query.dto';
import { TaxListQueryDto } from './dto/tax-list-query.dto';
import {
  PartyDefaultClassificationsResponseDto,
  TaxAutocompleteResponseDto,
  TaxContainerResponseDto,
  TaxDefaultAccountOptionsResponseDto,
  TaxDefaultAccountsContainerResponseDto,
  TaxDefaultAccountsListResponseDto,
  TaxListResponseDto,
  TaxTransactionTypesResponseDto,
  TaxTypesResponseDto,
} from './dto/tax-response.dto';
import { TaxService } from './tax.service';

@SkipThrottle()
@UseGuards(JwtAuthGuard)
@ApiTags('Tax')
@ApiBearerAuth()
@Controller({
  version: '1',
})
export class TaxController {
  constructor(private readonly taxService: TaxService) {}

  @Get('tax')
  @ApiOperation({ summary: 'Get list of tax records' })
  @ApiOkResponse({ type: TaxListResponseDto })
  listTaxes(@Query() query: TaxListQueryDto) {
    return this.taxService.listTaxes(query);
  }

  @Get('tax/autocomplete')
  @ApiOperation({ summary: 'Get tax autocomplete options' })
  @ApiOkResponse({ type: TaxAutocompleteResponseDto })
  listAutocomplete(@Query() query: TaxListQueryDto) {
    return this.taxService.listAutocomplete(query);
  }

  @Get('tax/transaction-types')
  @ApiOperation({ summary: 'Get tax transaction types' })
  @ApiOkResponse({ type: TaxTransactionTypesResponseDto })
  listTransactionTypes() {
    return this.taxService.listTransactionTypes();
  }

  @Get('tax/tax-types')
  @ApiOperation({ summary: 'Get tax types' })
  @ApiOkResponse({ type: TaxTypesResponseDto })
  listTaxTypes() {
    return this.taxService.listTaxTypes();
  }

  @Get('tax/party-default-classifications')
  @ApiOperation({ summary: 'Get party tax default classifications' })
  @ApiOkResponse({ type: PartyDefaultClassificationsResponseDto })
  listPartyDefaultClassifications() {
    return this.taxService.listPartyDefaultClassifications();
  }

  @Get('tax/default-account-options')
  @ApiOperation({ summary: 'Get tax options with default account titles by classification' })
  @ApiOkResponse({ type: TaxDefaultAccountOptionsResponseDto })
  listTaxDefaultAccountOptions(@CurrentUser() user: AuthUser, @Query() query: TaxDefaultAccountOptionsQueryDto) {
    return this.taxService.listTaxDefaultAccountOptions(user, query.classification);
  }

  @Get('tax-default-accounts')
  @ApiOperation({ summary: 'Get tax records with default account mappings' })
  @ApiOkResponse({ type: TaxDefaultAccountsListResponseDto })
  listTaxesWithDefaultAccounts(@CurrentUser() user: AuthUser, @Query() query: TaxListQueryDto) {
    return this.taxService.listTaxesWithDefaultAccounts(user, query);
  }

  @Get('tax-default-accounts/:sourceKey')
  @ApiOperation({ summary: 'Get tax record with default account mappings by source key' })
  @ApiOkResponse({ type: TaxDefaultAccountsContainerResponseDto })
  getTaxWithDefaultAccounts(@CurrentUser() user: AuthUser, @Param('sourceKey') sourceKey: string) {
    return this.taxService.getTaxWithDefaultAccounts(user, sourceKey);
  }

  @Get('tax/:sourceKey')
  @ApiOperation({ summary: 'Get tax record by source key' })
  @ApiOkResponse({ type: TaxContainerResponseDto })
  getTax(@Param('sourceKey') sourceKey: string) {
    return this.taxService.getTax(sourceKey);
  }
}
