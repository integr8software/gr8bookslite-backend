import { Body, Controller, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateItemBasicInfoDto, UpdateItemBasicInfoDto, ItemBasicInfoResponseDto, ItemBasicInfoListResponseDto } from './dto/item-basic-info.dto';
import { UpsertItemPricingDto, ItemPricingResponseDto } from './dto/item-pricing.dto';
import { ItemsService } from './items.service';

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiTags('Items')
@Controller({ path: 'maintenance/items', version: '1' })
export class ItemsController {
  constructor(private readonly items: ItemsService) {}

  @Get() @ApiOkResponse({ type: ItemBasicInfoListResponseDto })
  findAll(@CurrentUser() user: AuthUser) { return this.items.findAll(user); }

  @Get(':id') @ApiOkResponse({ type: ItemBasicInfoResponseDto })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.items.findOne(user, id); }

  @Post() @ApiCreatedResponse({ type: ItemBasicInfoResponseDto })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateItemBasicInfoDto) { return this.items.create(user, dto); }

  @Patch(':id') @ApiOkResponse({ type: ItemBasicInfoResponseDto })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateItemBasicInfoDto) { return this.items.update(user, id, dto); }

  @Get(':id/pricing') @ApiOkResponse({ type: ItemPricingResponseDto })
  getPricing(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.items.getPricing(user, id); }

  @Put(':id/pricing') @ApiOkResponse({ type: ItemPricingResponseDto })
  upsertPricing(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpsertItemPricingDto) { return this.items.upsertPricing(user, id, dto); }
}
