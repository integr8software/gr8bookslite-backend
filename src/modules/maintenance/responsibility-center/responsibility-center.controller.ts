import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateResponsibilityCenterDto } from './dto/create-responsibility-center.dto';
import { GetResponsibilityCenterListQueryDto } from './dto/get-responsibility-center-list-query.dto';
import { UpdateResponsibilityCenterStatusDto } from './dto/update-responsibility-center-status.dto';
import { UpdateResponsibilityCenterDto } from './dto/update-responsibility-center.dto';
import { ResponsibilityCenterService } from './responsibility-center.service';

@UseGuards(JwtAuthGuard)
@ApiTags('Responsibility Center')
@Controller({
  path: 'maintenance/financial-management/responsibility-centers',
  version: '1',
})
export class ResponsibilityCenterController {
  constructor(private readonly responsibilityCenterService: ResponsibilityCenterService) {}

  @Get()
  @ApiOkResponse({ description: 'Responsibility center list retrieved.' })
  findAll(@CurrentUser() user: AuthUser, @Query() query: GetResponsibilityCenterListQueryDto) {
    return this.responsibilityCenterService.findAll(user, query);
  }

  @Get('tree')
  @ApiOkResponse({ description: 'Responsibility center tree retrieved.' })
  findTree(@CurrentUser() user: AuthUser, @Query() query: GetResponsibilityCenterListQueryDto) {
    return this.responsibilityCenterService.findTree(user, query);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Responsibility center retrieved.' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.responsibilityCenterService.findOne(user, id);
  }

  @Post()
  @ApiCreatedResponse({ description: 'Responsibility center created.' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateResponsibilityCenterDto) {
    return this.responsibilityCenterService.create(user, dto);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Responsibility center updated.' })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateResponsibilityCenterDto) {
    return this.responsibilityCenterService.update(user, id, dto);
  }

  @Patch(':id/status')
  @ApiOkResponse({ description: 'Responsibility center status updated.' })
  updateStatus(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateResponsibilityCenterStatusDto) {
    return this.responsibilityCenterService.updateStatus(user, id, dto);
  }
}
