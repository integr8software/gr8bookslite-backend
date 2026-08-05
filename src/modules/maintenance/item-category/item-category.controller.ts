import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateItemCategoryDto } from './dto/create-item-category.dto';
import { ItemCategoryListResponseDto, ItemCategoryOptionsResponseDto, SaveItemCategoryResponseDto } from './dto/item-category-response.dto';
import { UpdateItemCategoryDto } from './dto/update-item-category.dto';
import { ItemCategoryService } from './item-category.service';
import { ItemCategoryLookupService } from './lookups/item-category-lookup.service';

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
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
  @ApiOkResponse({ type: ItemCategoryListResponseDto })
  findAll(@CurrentUser() user: AuthUser) {
    return this.itemCategoryService.findAll(user);
  }

  @Get('options')
  @ApiOkResponse({ type: ItemCategoryOptionsResponseDto })
  findOptions(@CurrentUser() user: AuthUser) {
    return this.itemCategoryLookupService.findOptionsForCompanyUser(user);
  }

  @Post()
  @ApiCreatedResponse({ type: SaveItemCategoryResponseDto })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateItemCategoryDto) {
    return this.itemCategoryService.create(user, dto);
  }

  @Patch(':id')
  @ApiOkResponse({ type: SaveItemCategoryResponseDto })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateItemCategoryDto) {
    return this.itemCategoryService.update(user, id, dto);
  }
}
