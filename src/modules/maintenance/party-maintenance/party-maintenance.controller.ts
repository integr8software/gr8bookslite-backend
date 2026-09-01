import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreatePartyDto } from './dto/create-party.dto';
import { GetPartyListQueryDto } from './dto/get-party-list-query.dto';
import { ImportPartiesDto } from './dto/import-parties.dto';
import { PartyOptionsQueryDto, PartyTypedOptionsQueryDto } from './dto/party-options-query.dto';
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
  @ApiOperation({ summary: 'Get paginated list of party records' })
  @ApiOkResponse({ type: PartyListResponseDto })
  findAll(@CurrentUser() user: AuthUser, @Query() query: GetPartyListQueryDto) {
    return this.partyMaintenanceService.findAll(user, query);
  }

  @Get('accounting-options')
  @ApiOperation({ summary: 'Get party accounting options' })
  @ApiOkResponse({ type: PartyAccountingOptionsResponseDto })
  findAccountingOptions(@CurrentUser() user: AuthUser) {
    return this.partyLookupService.findAccountingOptionsForCompanyUser(user);
  }

  @Get('options')
  @ApiOperation({ summary: 'Get party options' })
  @ApiOkResponse({ type: PartyOptionsResponseDto })
  findOptionList(@CurrentUser() user: AuthUser, @Query() query: PartyOptionsQueryDto) {
    return this.partyLookupService.findOptionsForCompanyUser(user, query);
  }

  @Get('options/:partyType')
  @ApiOperation({ summary: 'Get party options by party type' })
  @ApiOkResponse({ type: PartyOptionsResponseDto })
  findOptions(@CurrentUser() user: AuthUser, @Param('partyType') partyType: string, @Query() query: PartyTypedOptionsQueryDto) {
    return this.partyLookupService.findOptionsForCompanyUser(user, { ...query, partyType });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get party details by ID' })
  @ApiOkResponse({ type: PartyContainerResponseDto })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.partyMaintenanceService.findOne(user, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a party record' })
  @ApiCreatedResponse({ type: SavePartyResponseDto })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePartyDto) {
    return this.partyMaintenanceService.create(user, dto);
  }

  @Post('import')
  @ApiOperation({ summary: 'Import party records' })
  @ApiCreatedResponse({ type: ImportPartiesResponseDto })
  importParties(@CurrentUser() user: AuthUser, @Body() dto: ImportPartiesDto) {
    return this.partyMaintenanceService.importParties(user, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a party record' })
  @ApiOkResponse({ type: SavePartyResponseDto })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdatePartyDto) {
    return this.partyMaintenanceService.update(user, id, dto);
  }
}
