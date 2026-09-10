import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { TransactionNumberSuggestionResponseDto } from '../../../common/dto/transaction-number-suggestion-response.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { DisbursementVoucherService } from './disbursement-voucher.service';
import { DisbursementVoucherListResponseDto, DisbursementVoucherSingleResponseDto } from './dto/disbursement-voucher-response.dto';
import { CreateDisbursementVoucherDto } from './dto/create-disbursement-voucher.dto';
import { GetDisbursementVoucherListQueryDto } from './dto/get-disbursement-voucher-list-query.dto';
import { UpdateDisbursementVoucherStatusDto } from './dto/update-disbursement-voucher-status.dto';
import { UpdateDisbursementVoucherDto } from './dto/update-disbursement-voucher.dto';

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiTags('Disbursement Voucher')
@Controller({
  path: 'cash-disbursement/disbursement-voucher',
  version: '1',
})
export class DisbursementVoucherController {
  constructor(private readonly disbursementVoucherService: DisbursementVoucherService) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated list of disbursement voucher records' })
  @ApiOkResponse({ type: DisbursementVoucherListResponseDto })
  findAll(@CurrentUser() user: AuthUser, @Query() query: GetDisbursementVoucherListQueryDto) {
    return this.disbursementVoucherService.findAll(user, query);
  }

  @Get('transaction-number')
  @ApiOperation({ summary: 'Get auto-suggested transaction number sequence' })
  @ApiOkResponse({ description: 'Disbursement Voucher transaction number retrieved.', type: TransactionNumberSuggestionResponseDto })
  suggestTransactionNumber(@CurrentUser() user: AuthUser, @Query() query: GetDisbursementVoucherListQueryDto) {
    return this.disbursementVoucherService.suggestTransactionNumber(user, query.branchUnitId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single disbursement voucher details by ID' })
  @ApiOkResponse({ type: DisbursementVoucherSingleResponseDto })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string, @Query() query: GetDisbursementVoucherListQueryDto) {
    return this.disbursementVoucherService.findOne(user, id, query.branchUnitId);
  }

  @Post()
  @ApiOperation({ summary: 'Create new disbursement voucher record' })
  @ApiCreatedResponse({ type: DisbursementVoucherSingleResponseDto })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateDisbursementVoucherDto) {
    return this.disbursementVoucherService.create(user, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update existing disbursement voucher record' })
  @ApiOkResponse({ type: DisbursementVoucherSingleResponseDto })
  updatePut(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateDisbursementVoucherDto) {
    return this.disbursementVoucherService.update(user, id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Patch existing disbursement voucher record' })
  @ApiOkResponse({ type: DisbursementVoucherSingleResponseDto })
  updatePatch(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateDisbursementVoucherDto) {
    return this.disbursementVoucherService.update(user, id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update disbursement voucher status' })
  @ApiOkResponse({ type: DisbursementVoucherSingleResponseDto })
  updateStatus(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateDisbursementVoucherStatusDto) {
    return this.disbursementVoucherService.updateStatus(user, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel/soft-delete disbursement voucher record' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Disbursement Voucher record cancelled successfully.' },
      },
    },
  })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.disbursementVoucherService.remove(user, id);
  }
}
