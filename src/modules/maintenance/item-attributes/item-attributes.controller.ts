import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateItemAttributeDto } from './dto/create-item-attribute.dto';
import { UpdateItemAttributeDto } from './dto/update-item-attribute.dto';
import { ItemAttributesService } from './item-attributes.service';

@UseGuards(JwtAuthGuard)
@ApiTags('Item Attributes')
@Controller({
  path: 'maintenance/item-attributes',
  version: '1',
})
export class ItemAttributesController {
  constructor(private readonly itemAttributesService: ItemAttributesService) {}

  @Get()
  @ApiOkResponse({ description: 'Item attribute list retrieved.' })
  findAll(@CurrentUser() user: AuthUser) {
    return this.itemAttributesService.findAll(user);
  }

  @Get('options')
  @ApiOkResponse({ description: 'Item attribute options retrieved.' })
  findOptions(@CurrentUser() user: AuthUser) {
    return this.itemAttributesService.findOptions(user);
  }

  @Post()
  @ApiCreatedResponse({ description: 'Item attribute created.' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateItemAttributeDto) {
    return this.itemAttributesService.create(user, dto);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Item attribute updated.' })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateItemAttributeDto) {
    return this.itemAttributesService.update(user, id, dto);
  }
}
