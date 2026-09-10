import { Body, Controller, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  CreateItemBasicInfoDto,
  UpdateItemBasicInfoDto,
  ItemBasicInfoResponseDto,
  ItemBasicInfoListResponseDto,
  ItemBasicInfoOptionsResponseDto,
} from './dto/item-basic-info.dto';
import { UpsertItemPricingDto, ItemPricingResponseDto } from './dto/item-pricing.dto';
import { ItemsService } from './items.service';
import { ItemsLookupService } from './lookups/items-lookup.service';

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiTags('Items')
@Controller({ path: 'maintenance/items', version: '1' })
export class ItemsController {
  constructor(
    private readonly items: ItemsService,
    private readonly itemsLookupService: ItemsLookupService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get list of item basic info records' })
  @ApiOkResponse({ type: ItemBasicInfoListResponseDto })
  findAll(@CurrentUser() user: AuthUser) {
    return this.items.findAll(user);
  }

  @Get('options')
  @ApiOperation({ summary: 'Get item options' })
  @ApiOkResponse({ type: ItemBasicInfoOptionsResponseDto })
  findOptions(@CurrentUser() user: AuthUser) {
    return this.itemsLookupService.findOptionsForCompanyUser(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get item basic info record by id' })
  @ApiOkResponse({ type: ItemBasicInfoResponseDto })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.items.findOne(user, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create an item basic info record' })
  @ApiCreatedResponse({ type: ItemBasicInfoResponseDto })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateItemBasicInfoDto) {
    return this.items.create(user, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an item basic info record' })
  @ApiOkResponse({ type: ItemBasicInfoResponseDto })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateItemBasicInfoDto) {
    return this.items.update(user, id, dto);
  }

  @Get(':id/pricing')
  @ApiOperation({ summary: 'Get pricing details for an item' })
  @ApiOkResponse({ type: ItemPricingResponseDto })
  getPricing(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.items.getPricing(user, id);
  }

  @Put(':id/pricing')
  @ApiOperation({ summary: 'Upsert pricing details for an item' })
  @ApiOkResponse({ type: ItemPricingResponseDto })
  upsertPricing(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpsertItemPricingDto) {
    return this.items.upsertPricing(user, id, dto);
  }
}
