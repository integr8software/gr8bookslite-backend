import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateItemVariationDto } from './dto/create-item-variation.dto';
import { UpdateItemVariationDto } from './dto/update-item-variation.dto';
import { ItemVariationsService } from './item-variations.service';
import { ItemVariationsLookupService } from './lookups/item-variations-lookup.service';

@UseGuards(JwtAuthGuard)
@ApiTags('Item Variations')
@Controller({
  path: 'maintenance/item-variations',
  version: '1',
})
export class ItemVariationsController {
  constructor(
    private readonly itemVariationsService: ItemVariationsService,
    private readonly itemVariationsLookupService: ItemVariationsLookupService,
  ) {}

  @Get()
  @ApiOkResponse({ description: 'Item variation list retrieved.' })
  findAll(@CurrentUser() user: AuthUser) {
    return this.itemVariationsService.findAll(user);
  }

  @Get('options')
  @ApiOkResponse({ description: 'Item variation options retrieved.' })
  findOptions(@CurrentUser() user: AuthUser) {
    return this.itemVariationsLookupService.findOptionsForCompanyUser(user);
  }

  @Post()
  @ApiCreatedResponse({ description: 'Item variation created.' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateItemVariationDto) {
    return this.itemVariationsService.create(user, dto);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Item variation updated.' })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateItemVariationDto) {
    return this.itemVariationsService.update(user, id, dto);
  }
}
