import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateTermDto } from './dto/create-term.dto';
import { GetTermListQueryDto } from './dto/get-term-list-query.dto';
import { ImportTermsDto } from './dto/import-terms.dto';
import { UpdateTermDto } from './dto/update-term.dto';
import { TermsMaintenanceService } from './terms-maintenance.service';

@UseGuards(JwtAuthGuard)
@ApiTags('Terms Maintenance')
@Controller({
  path: 'maintenance/terms-maintenance',
  version: '1',
})
export class TermsMaintenanceController {
  constructor(private readonly termsMaintenanceService: TermsMaintenanceService) {}

  @Get()
  @ApiOkResponse({ description: 'Term list retrieved.' })
  findAll(@CurrentUser() user: AuthUser, @Query() query: GetTermListQueryDto) {
    return this.termsMaintenanceService.findAll(user, query);
  }

  @Get('options')
  @ApiOkResponse({ description: 'Term options retrieved.' })
  findOptions(@CurrentUser() user: AuthUser, @Query() query: GetTermListQueryDto) {
    return this.termsMaintenanceService.findOptions(user, query);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Term retrieved.' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.termsMaintenanceService.findOne(user, id);
  }

  @Post()
  @ApiCreatedResponse({ description: 'Term created.' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTermDto) {
    return this.termsMaintenanceService.create(user, dto);
  }

  @Post('import')
  @ApiCreatedResponse({ description: 'Terms imported.' })
  importTerms(@CurrentUser() user: AuthUser, @Body() dto: ImportTermsDto) {
    return this.termsMaintenanceService.importTerms(user, dto);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Term updated.' })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateTermDto) {
    return this.termsMaintenanceService.update(user, id, dto);
  }
}
