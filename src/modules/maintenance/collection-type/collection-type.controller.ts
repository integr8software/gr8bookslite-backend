import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DefaultAccountTemplateType } from '@prisma/client';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  CollectionTypeAccountOptionsResponseDto,
  CollectionTypeContainerResponseDto,
  CollectionTypeListResponseDto,
  CollectionTypeOptionsResponseDto,
  SaveCollectionTypeResponseDto,
} from '../collection-type/dto/collection-type-response.dto';
import { CreateCollectionTypeTemplateDto } from '../collection-type/dto/create-collection-type-template.dto';
import { CollectionTypeOptionQueryDto } from '../collection-type/dto/collection-type-option-query.dto';
import { GetCollectionTypeTemplateListQueryDto } from '../collection-type/dto/get-collection-type-template-list-query.dto';
import { UpdateCollectionTypeTemplateDto } from '../collection-type/dto/update-collection-type-template.dto';
import { UpdateCollectionTypeTemplateStatusDto } from '../collection-type/dto/update-collection-type-template-status.dto';
import { CollectionTypeModuleCode, CollectionTypeService } from '../collection-type/collection-type.service';

const CollectionTypeContext = {
  moduleCode: CollectionTypeModuleCode,
  type: DefaultAccountTemplateType.COLLECTION,
  label: 'collection types',
};

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiTags('Collection Type Maintenance')
@Controller({
  path: 'maintenance/financial-management/collection-types',
  version: '1',
})
export class CollectionTypeController {
  constructor(private readonly collectionTypeService: CollectionTypeService) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated list of collection type records' })
  @ApiOkResponse({ type: CollectionTypeListResponseDto })
  findAll(@CurrentUser() user: AuthUser, @Query() query: GetCollectionTypeTemplateListQueryDto) {
    return this.collectionTypeService.findAll(user, query, CollectionTypeContext);
  }

  @Get('options')
  @ApiOperation({ summary: 'Get collection type options' })
  @ApiOkResponse({ type: CollectionTypeOptionsResponseDto })
  findOptions(@CurrentUser() user: AuthUser, @Query() query: CollectionTypeOptionQueryDto) {
    return this.collectionTypeService.findCollectionOptions(user, query);
  }

  @Get('account-options')
  @ApiOperation({ summary: 'Get collection type revenue account options' })
  @ApiOkResponse({ type: CollectionTypeAccountOptionsResponseDto })
  findAccountOptions(@CurrentUser() user: AuthUser) {
    return this.collectionTypeService.findAccountOptions(user, CollectionTypeContext);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get collection type details by ID' })
  @ApiOkResponse({ type: CollectionTypeContainerResponseDto })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.collectionTypeService.findOne(user, id, CollectionTypeContext);
  }

  @Post()
  @ApiOperation({ summary: 'Create a collection type record' })
  @ApiCreatedResponse({ type: SaveCollectionTypeResponseDto })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCollectionTypeTemplateDto) {
    return this.collectionTypeService.create(user, dto, CollectionTypeContext);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a collection type record' })
  @ApiOkResponse({ type: SaveCollectionTypeResponseDto })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateCollectionTypeTemplateDto) {
    return this.collectionTypeService.update(user, id, dto, CollectionTypeContext);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update collection type status' })
  @ApiOkResponse({ type: SaveCollectionTypeResponseDto })
  updateStatus(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateCollectionTypeTemplateStatusDto) {
    return this.collectionTypeService.updateStatus(user, id, dto, CollectionTypeContext);
  }
}
