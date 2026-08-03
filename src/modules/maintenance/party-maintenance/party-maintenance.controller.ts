import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreatePartyDto } from './dto/create-party.dto';
import { GetPartyListQueryDto } from './dto/get-party-list-query.dto';
import { ImportPartiesDto } from './dto/import-parties.dto';
import { UpdatePartyDto } from './dto/update-party.dto';
import { PartyLookupService } from './lookups/party-lookup.service';
import { PartyMaintenanceService } from './party-maintenance.service';
import {
  ImportPartiesResponseDto,
  PartyAccountingOptionsResponseDto,
  PartyContainerResponseDto,
  PartyListResponseDto,
  PartyOptionsResponseDto,
  SavePartyResponseDto,
} from './dto/party-response.dto';

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiTags('Party Maintenance')
@Controller({
  path: 'maintenance/party-maintenance',
  version: '1',
})
export class PartyMaintenanceController {
  constructor(
    private readonly partyMaintenanceService: PartyMaintenanceService,
    private readonly partyLookupService: PartyLookupService,
  ) {}

  @Get()
  @ApiOkResponse({ type: PartyListResponseDto })
  findAll(@CurrentUser() user: AuthUser, @Query() query: GetPartyListQueryDto) {
    return this.partyMaintenanceService.findAll(user, query);
  }

  @Get('accounting-options')
  @ApiOkResponse({ type: PartyAccountingOptionsResponseDto })
  findAccountingOptions(@CurrentUser() user: AuthUser) {
    return this.partyMaintenanceService.findAccountingOptions(user);
  }

  @Get('options/:partyType')
  @ApiOkResponse({ type: PartyOptionsResponseDto })
  findOptions(@CurrentUser() user: AuthUser, @Param('partyType') partyType: string) {
    return this.partyLookupService.findOptionsForCompanyUser(user, partyType);
  }

  @Get(':id')
  @ApiOkResponse({ type: PartyContainerResponseDto })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.partyMaintenanceService.findOne(user, id);
  }

  @Post()
  @ApiCreatedResponse({ type: SavePartyResponseDto })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePartyDto) {
    return this.partyMaintenanceService.create(user, dto);
  }

  @Post('import')
  @ApiCreatedResponse({ type: ImportPartiesResponseDto })
  importParties(@CurrentUser() user: AuthUser, @Body() dto: ImportPartiesDto) {
    return this.partyMaintenanceService.importParties(user, dto);
  }

  @Patch(':id')
  @ApiOkResponse({ type: SavePartyResponseDto })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdatePartyDto) {
    return this.partyMaintenanceService.update(user, id, dto);
  }
}
