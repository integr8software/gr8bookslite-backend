import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { TransactionNumberSuggestionResponseDto } from '../../../common/dto/transaction-number-suggestion-response.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { CreateRevolvingFundReplenishmentDto } from './dto/create-revolving-fund-replenishment.dto';
import { GetRevolvingFundReplenishmentListQueryDto } from './dto/get-revolving-fund-replenishment-list-query.dto';
import { RevolvingFundReplenishmentListResponseDto, RevolvingFundReplenishmentResponseDto } from './dto/revolving-fund-replenishment-response.dto';
import { UpdateRevolvingFundReplenishmentDto } from './dto/update-revolving-fund-replenishment.dto';
import { UpdateRevolvingFundReplenishmentStatusDto } from './dto/update-revolving-fund-replenishment-status.dto';
import { RevolvingFundReplenishmentService } from './revolving-fund-replenishment.service';

@ApiTags('Revolving Fund Replenishment')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({
  path: 'cash-disbursement/revolving-fund-replenishment',
  version: '1',
})
export class RevolvingFundReplenishmentController {
  constructor(private readonly service: RevolvingFundReplenishmentService) {}

  @Get('transaction-number')
  @ApiOperation({ summary: 'Suggest a Revolving Fund Replenishment transaction number' })
  @ApiOkResponse({ description: 'Revolving Fund Replenishment transaction number retrieved.', type: TransactionNumberSuggestionResponseDto })
  @ApiQuery({ name: 'branchUnitId', required: false, type: Number })
  suggestTransactionNumber(@CurrentUser() user: AuthUser, @Query('branchUnitId') branchUnitId?: number) {
    return this.service.suggestTransactionNumber(user, branchUnitId);
  }

  @Get()
  @ApiOperation({ summary: 'List Revolving Fund Replenishments with pagination and filtering' })
  @ApiOkResponse({ type: RevolvingFundReplenishmentListResponseDto })
  findAll(@CurrentUser() user: AuthUser, @Query() query: GetRevolvingFundReplenishmentListQueryDto) {
    return this.service.findAll(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get Revolving Fund Replenishment details by ID' })
  @ApiOkResponse({ type: RevolvingFundReplenishmentResponseDto })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.findOne(user, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new Revolving Fund Replenishment' })
  @ApiCreatedResponse({ type: RevolvingFundReplenishmentResponseDto })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateRevolvingFundReplenishmentDto) {
    return this.service.create(user, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing Revolving Fund Replenishment' })
  @ApiOkResponse({ type: RevolvingFundReplenishmentResponseDto })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateRevolvingFundReplenishmentDto) {
    return this.service.update(user, id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update status of a Revolving Fund Replenishment' })
  @ApiOkResponse({ type: RevolvingFundReplenishmentResponseDto })
  updateStatus(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateRevolvingFundReplenishmentStatusDto) {
    return this.service.updateStatus(user, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a Revolving Fund Replenishment' })
  @ApiOkResponse({ description: 'Deleted successfully' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.remove(user, id);
  }
}
