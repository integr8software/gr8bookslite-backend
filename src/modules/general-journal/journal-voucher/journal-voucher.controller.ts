import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateJournalVoucherDto } from './dto/create-journal-voucher.dto';
import { GetJournalVoucherListQueryDto } from './dto/get-journal-voucher-list-query.dto';
import { UpdateJournalVoucherStatusDto } from './dto/update-journal-voucher-status.dto';
import { UpdateJournalVoucherDto } from './dto/update-journal-voucher.dto';
import { JournalVoucherLookupService } from './services/journal-voucher-lookup.service';
import { JournalVoucherService } from './journal-voucher.service';

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiTags('Journal Voucher')
@Controller({
  path: 'general-journal/journal-voucher',
  version: '1',
})
export class JournalVoucherController {
  constructor(
    private readonly journalVoucherService: JournalVoucherService,
    private readonly journalVoucherLookupService: JournalVoucherLookupService,
  ) {}

  @Get()
  @ApiOkResponse({ description: 'Journal vouchers retrieved.' })
  findAll(@CurrentUser() user: AuthUser, @Query() query: GetJournalVoucherListQueryDto) {
    return this.journalVoucherService.findAll(user, query);
  }

  @Get('transaction-number')
  @ApiOkResponse({ description: 'Journal voucher transaction number retrieved.' })
  suggestTransactionNumber(@CurrentUser() user: AuthUser, @Query() query: GetJournalVoucherListQueryDto) {
    return this.journalVoucherService.suggestTransactionNumber(user, query.branchUnitId);
  }

  @Get('lookups')
  @ApiOkResponse({ description: 'Journal voucher lookup options retrieved.' })
  findLookupOptions(@CurrentUser() user: AuthUser) {
    return this.journalVoucherLookupService.findOptions(user);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Journal voucher retrieved.' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string, @Query() query: GetJournalVoucherListQueryDto) {
    return this.journalVoucherService.findOne(user, id, query.branchUnitId);
  }

  @Post()
  @ApiCreatedResponse({ description: 'Journal voucher created.' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateJournalVoucherDto) {
    return this.journalVoucherService.create(user, dto);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Journal voucher updated.' })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateJournalVoucherDto) {
    return this.journalVoucherService.update(user, id, dto);
  }

  @Patch(':id/status')
  @ApiOkResponse({ description: 'Journal voucher status updated.' })
  updateStatus(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateJournalVoucherStatusDto) {
    return this.journalVoucherService.updateStatus(user, id, dto);
  }
}
