import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateTermDto } from './dto/create-term.dto';
import { GetTermListQueryDto } from './dto/get-term-list-query.dto';
import { ImportTermsDto } from './dto/import-terms.dto';
import { ImportTermsResponseDto, SaveTermResponseDto, TermContainerResponseDto, TermListResponseDto, TermLookupResponseDto } from './dto/term-response.dto';
import { TermLookupQueryDto } from './dto/term-lookup-query.dto';
import { UpdateTermDto } from './dto/update-term.dto';
import { TermsLookupService } from './lookups/terms-lookup.service';
import { TermsMaintenanceService } from './terms-maintenance.service';

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiTags('Terms Maintenance')
@Controller({
  path: 'maintenance/terms-maintenance',
  version: '1',
})
export class TermsMaintenanceController {
  constructor(
    private readonly termsMaintenanceService: TermsMaintenanceService,
    private readonly termsLookupService: TermsLookupService,
  ) {}

  @Get()
  @ApiOkResponse({ type: TermListResponseDto })
  findAll(@CurrentUser() user: AuthUser, @Query() query: GetTermListQueryDto) {
    return this.termsMaintenanceService.findAll(user, query);
  }

  @Get('options')
  @ApiOkResponse({ type: TermLookupResponseDto })
  findOptions(@CurrentUser() user: AuthUser, @Query() query: TermLookupQueryDto) {
    return this.termsLookupService.findOptionsForCompanyUser(user, query);
  }

  @Get(':id')
  @ApiOkResponse({ type: TermContainerResponseDto })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.termsMaintenanceService.findOne(user, id);
  }

  @Post()
  @ApiCreatedResponse({ type: SaveTermResponseDto })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTermDto) {
    return this.termsMaintenanceService.create(user, dto);
  }

  @Post('import')
  @ApiCreatedResponse({ type: ImportTermsResponseDto })
  importTerms(@CurrentUser() user: AuthUser, @Body() dto: ImportTermsDto) {
    return this.termsMaintenanceService.importTerms(user, dto);
  }

  @Patch(':id')
  @ApiOkResponse({ type: SaveTermResponseDto })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateTermDto) {
    return this.termsMaintenanceService.update(user, id, dto);
  }
}
