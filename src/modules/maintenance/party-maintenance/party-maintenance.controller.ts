import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreatePartyDto } from './dto/create-party.dto';
import { GetPartyListQueryDto } from './dto/get-party-list-query.dto';
import { ImportPartiesDto } from './dto/import-parties.dto';
import { UpdatePartyDto } from './dto/update-party.dto';
import { PartyMaintenanceService } from './party-maintenance.service';

@UseGuards(JwtAuthGuard)
@ApiTags('Party Maintenance')
@Controller({
  path: 'maintenance/party-maintenance',
  version: '1',
})
export class PartyMaintenanceController {
  constructor(private readonly partyMaintenanceService: PartyMaintenanceService) {}

  @Get()
  @ApiOkResponse({ description: 'Party list retrieved.' })
  findAll(@CurrentUser() user: AuthUser, @Query() query: GetPartyListQueryDto) {
    return this.partyMaintenanceService.findAll(user, query);
  }

  @Get('accounting-options')
  @ApiOkResponse({ description: 'Party accounting account options retrieved.' })
  findAccountingOptions(@CurrentUser() user: AuthUser) {
    return this.partyMaintenanceService.findAccountingOptions(user);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Party retrieved.' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.partyMaintenanceService.findOne(user, id);
  }

  @Post()
  @ApiCreatedResponse({ description: 'Party created.' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePartyDto) {
    return this.partyMaintenanceService.create(user, dto);
  }

  @Post('import')
  @ApiCreatedResponse({ description: 'Parties imported.' })
  importParties(@CurrentUser() user: AuthUser, @Body() dto: ImportPartiesDto) {
    return this.partyMaintenanceService.importParties(user, dto);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Party updated.' })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdatePartyDto) {
    return this.partyMaintenanceService.update(user, id, dto);
  }
}
