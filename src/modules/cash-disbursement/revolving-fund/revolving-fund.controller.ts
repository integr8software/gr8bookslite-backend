import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { TransactionNumberSuggestionResponseDto } from '../../../common/dto/transaction-number-suggestion-response.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { CreateRevolvingFundDto } from './dto/create-revolving-fund.dto';
import { GetRevolvingFundListQueryDto } from './dto/get-revolving-fund-list-query.dto';
import { RevolvingFundListResponseDto, RevolvingFundResponseDto } from './dto/revolving-fund-response.dto';
import { UpdateRevolvingFundDto } from './dto/update-revolving-fund.dto';
import { UpdateRevolvingFundStatusDto } from './dto/update-revolving-fund-status.dto';
import { RevolvingFundService } from './revolving-fund.service';

@ApiTags('Revolving Fund')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({
  path: 'cash-disbursement/revolving-fund',
  version: '1',
})
export class RevolvingFundController {
  constructor(private readonly service: RevolvingFundService) {}

  @Get('transaction-number')
  @ApiOperation({ summary: 'Suggest a Revolving Fund transaction number' })
  @ApiOkResponse({ description: 'Revolving Fund transaction number retrieved.', type: TransactionNumberSuggestionResponseDto })
  @ApiQuery({ name: 'branchUnitId', required: false, type: Number })
  suggestTransactionNumber(@CurrentUser() user: AuthUser, @Query('branchUnitId') branchUnitId?: number) {
    return this.service.suggestTransactionNumber(user, branchUnitId);
  }

  @Get()
  @ApiOperation({ summary: 'List Revolving Funds with pagination and filtering' })
  @ApiOkResponse({ type: RevolvingFundListResponseDto })
  findAll(@CurrentUser() user: AuthUser, @Query() query: GetRevolvingFundListQueryDto) {
    return this.service.findAll(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get Revolving Fund details by ID' })
  @ApiOkResponse({ type: RevolvingFundResponseDto })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.findOne(user, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new Revolving Fund' })
  @ApiCreatedResponse({ type: RevolvingFundResponseDto })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateRevolvingFundDto) {
    return this.service.create(user, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing Revolving Fund' })
  @ApiOkResponse({ type: RevolvingFundResponseDto })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateRevolvingFundDto) {
    return this.service.update(user, id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update status of a Revolving Fund' })
  @ApiOkResponse({ type: RevolvingFundResponseDto })
  updateStatus(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateRevolvingFundStatusDto) {
    return this.service.updateStatus(user, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a Revolving Fund' })
  @ApiOkResponse({ description: 'Deleted successfully' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.remove(user, id);
  }
}
