import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateResponsibilityCenterDto } from './dto/create-responsibility-center.dto';
import { GetResponsibilityCenterListQueryDto } from './dto/get-responsibility-center-list-query.dto';
import { ResponsibilityCenterLookupService } from './lookups/responsibility-center-lookup.service';
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
  @ApiOkResponse({ type: ResponsibilityCenterListResponseDto })
  findAll(@CurrentUser() user: AuthUser, @Query() query: GetResponsibilityCenterListQueryDto) {
    return this.responsibilityCenterService.findAll(user, query);
  }

  @Get('options')
  @ApiOkResponse({ type: ResponsibilityCenterOptionsResponseDto })
  findOptions(@CurrentUser() user: AuthUser, @Query() query: GetResponsibilityCenterListQueryDto) {
    return this.responsibilityCenterLookupService.findOptionsForCompanyUser(user, query);
  }

  @Get('tree')
  @ApiOkResponse({ type: ResponsibilityCenterTreeResponseDto })
  findTree(@CurrentUser() user: AuthUser, @Query() query: GetResponsibilityCenterListQueryDto) {
    return this.responsibilityCenterService.findTree(user, query);
  }

  @Get('classifications')
  @ApiOkResponse({ type: ResponsibilityCenterClassificationsResponseDto })
  findClassifications(@CurrentUser() user: AuthUser) {
    return this.responsibilityCenterService.findClassifications(user);
  }

  @Get('types')
  @ApiOkResponse({ type: ResponsibilityCenterTypesResponseDto })
  findTypes(@CurrentUser() user: AuthUser, @Query('classificationId') classificationId?: string) {
    return this.responsibilityCenterService.findTypes(user, classificationId);
  }

  @Get('code-suggestion')
  @ApiOkResponse({ type: ResponsibilityCenterCodeSuggestionResponseDto })
  suggestCode(@CurrentUser() user: AuthUser, @Query('typeId') typeId: string) {
    return this.responsibilityCenterService.suggestCode(user, typeId);
  }

  @Get(':id')
  @ApiOkResponse({ type: ResponsibilityCenterContainerResponseDto })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.responsibilityCenterService.findOne(user, id);
  }

  @Post()
  @ApiCreatedResponse({ type: SaveResponsibilityCenterResponseDto })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateResponsibilityCenterDto) {
    return this.responsibilityCenterService.create(user, dto);
  }

  @Patch(':id')
  @ApiOkResponse({ type: SaveResponsibilityCenterResponseDto })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateResponsibilityCenterDto) {
    return this.responsibilityCenterService.update(user, id, dto);
  }

  @Patch(':id/status')
  @ApiOkResponse({ type: SaveResponsibilityCenterResponseDto })
  updateStatus(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateResponsibilityCenterStatusDto) {
    return this.responsibilityCenterService.updateStatus(user, id, dto);
  }
}

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiTags('Responsibility Center')
@Controller({
  path: 'maintenance/responsibility-center',
  version: '1',
})
export class ResponsibilityCenterLookupController {
  constructor(private readonly responsibilityCenterLookupService: ResponsibilityCenterLookupService) {}

  @Get('options')
  @ApiOkResponse({ type: ResponsibilityCenterOptionsResponseDto })
  findOptions(@CurrentUser() user: AuthUser, @Query() query: GetResponsibilityCenterListQueryDto) {
    return this.responsibilityCenterLookupService.findOptionsForCompanyUser(user, query);
  }
}
