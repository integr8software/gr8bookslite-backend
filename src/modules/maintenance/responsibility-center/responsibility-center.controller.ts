import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateResponsibilityCenterDto } from './dto/create-responsibility-center.dto';
import { GetResponsibilityCenterListQueryDto } from './dto/get-responsibility-center-list-query.dto';
import { UpdateResponsibilityCenterStatusDto } from './dto/update-responsibility-center-status.dto';
import { UpdateResponsibilityCenterDto } from './dto/update-responsibility-center.dto';
import {
  ResponsibilityCenterClassificationsResponseDto,
  ResponsibilityCenterCodeSuggestionResponseDto,
  ResponsibilityCenterContainerResponseDto,
  ResponsibilityCenterListResponseDto,
  ResponsibilityCenterOptionsResponseDto,
  ResponsibilityCenterTreeResponseDto,
  ResponsibilityCenterTypesResponseDto,
  SaveResponsibilityCenterResponseDto,
} from './dto/responsibility-center-response.dto';
import { ResponsibilityCenterLookupService } from './lookups/responsibility-center-lookup.service';
import { ResponsibilityCenterService } from './responsibility-center.service';

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiTags('Responsibility Center')
@Controller({
  path: 'maintenance/financial-management/responsibility-centers',
  version: '1',
})
export class ResponsibilityCenterController {
  constructor(
    private readonly responsibilityCenterService: ResponsibilityCenterService,
    private readonly responsibilityCenterLookupService: ResponsibilityCenterLookupService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated list of responsibility center records' })
  @ApiOkResponse({ type: ResponsibilityCenterListResponseDto })
  findAll(@CurrentUser() user: AuthUser, @Query() query: GetResponsibilityCenterListQueryDto) {
    return this.responsibilityCenterService.findAll(user, query);
  }

  @Get('options')
  @ApiOperation({ summary: 'Get responsibility center options' })
  @ApiOkResponse({ type: ResponsibilityCenterOptionsResponseDto })
  findOptions(@CurrentUser() user: AuthUser, @Query() query: GetResponsibilityCenterListQueryDto) {
    return this.responsibilityCenterLookupService.findOptionsForCompanyUser(user, query);
  }

  @Get('options/:type')
  @ApiOperation({ summary: 'Get responsibility center options by type' })
  @ApiOkResponse({ type: ResponsibilityCenterOptionsResponseDto })
  findOptionsByType(@CurrentUser() user: AuthUser, @Param('type') type: string, @Query() query: GetResponsibilityCenterListQueryDto) {
    return this.responsibilityCenterLookupService.findOptionsForCompanyUser(user, {
      ...query,
      typeId: type,
    });
  }

  @Get('tree')
  @ApiOperation({ summary: 'Get responsibility center tree' })
  @ApiOkResponse({ type: ResponsibilityCenterTreeResponseDto })
  findTree(@CurrentUser() user: AuthUser, @Query() query: GetResponsibilityCenterListQueryDto) {
    return this.responsibilityCenterService.findTree(user, query);
  }

  @Get('classifications')
  @ApiOperation({ summary: 'Get responsibility center classifications' })
  @ApiOkResponse({ type: ResponsibilityCenterClassificationsResponseDto })
  findClassifications(@CurrentUser() user: AuthUser) {
    return this.responsibilityCenterService.findClassifications(user);
  }

  @Get('types')
  @ApiOperation({ summary: 'Get responsibility center types' })
  @ApiOkResponse({ type: ResponsibilityCenterTypesResponseDto })
  findTypes(@CurrentUser() user: AuthUser, @Query('classificationId') classificationId?: string) {
    return this.responsibilityCenterService.findTypes(user, classificationId);
  }

  @Get('code-suggestion')
  @ApiOperation({ summary: 'Get suggested responsibility center code' })
  @ApiOkResponse({ type: ResponsibilityCenterCodeSuggestionResponseDto })
  suggestCode(@CurrentUser() user: AuthUser, @Query('typeId') typeId: string) {
    return this.responsibilityCenterService.suggestCode(user, typeId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get responsibility center details by ID' })
  @ApiOkResponse({ type: ResponsibilityCenterContainerResponseDto })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.responsibilityCenterService.findOne(user, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a responsibility center record' })
  @ApiCreatedResponse({ type: SaveResponsibilityCenterResponseDto })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateResponsibilityCenterDto) {
    return this.responsibilityCenterService.create(user, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a responsibility center record' })
  @ApiOkResponse({ type: SaveResponsibilityCenterResponseDto })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateResponsibilityCenterDto) {
    return this.responsibilityCenterService.update(user, id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update responsibility center status' })
  @ApiOkResponse({ type: SaveResponsibilityCenterResponseDto })
  updateStatus(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateResponsibilityCenterStatusDto) {
    return this.responsibilityCenterService.updateStatus(user, id, dto);
  }
}
