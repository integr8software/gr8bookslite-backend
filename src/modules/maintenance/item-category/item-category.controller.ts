import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateItemCategoryDto } from './dto/create-item-category.dto';
import { UpdateItemCategoryDto } from './dto/update-item-category.dto';
import { ItemCategoryService } from './item-category.service';
import { ItemCategoryLookupService } from './lookups/item-category-lookup.service';

@UseGuards(JwtAuthGuard)
@ApiTags('Item Categories')
@Controller({
  path: 'maintenance/item-categories',
  version: '1',
})
export class ItemCategoryController {
  constructor(
    private readonly itemCategoryService: ItemCategoryService,
    private readonly itemCategoryLookupService: ItemCategoryLookupService,
  ) {}

  @Get()
  @ApiOkResponse({ description: 'Item category list retrieved.' })
  findAll(@CurrentUser() user: AuthUser) {
    return this.itemCategoryService.findAll(user);
  }

  @Get('options')
  @ApiOkResponse({ description: 'Item category options retrieved.' })
  findOptions(@CurrentUser() user: AuthUser) {
    return this.itemCategoryLookupService.findOptionsForCompanyUser(user);
  }

  @Post()
  @ApiCreatedResponse({ description: 'Item category created.' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateItemCategoryDto) {
    return this.itemCategoryService.create(user, dto);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Item category updated.' })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateItemCategoryDto) {
    return this.itemCategoryService.update(user, id, dto);
  }
}
