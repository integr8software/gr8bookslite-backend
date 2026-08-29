import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdvancesToSuppliersService } from './advances-to-suppliers.service';
import { AdvanceToSupplierListResponseDto, AdvanceToSupplierResponseDto } from './dto/advance-to-supplier-response.dto';
import { CreateAdvanceToSupplierDto } from './dto/create-advance-to-supplier.dto';
import { GetAdvanceToSupplierListQueryDto } from './dto/get-advance-to-supplier-list-query.dto';
import { UpdateAdvanceToSupplierStatusDto } from './dto/update-advance-to-supplier-status.dto';
import { UpdateAdvanceToSupplierDto } from './dto/update-advance-to-supplier.dto';

@ApiTags('Cash Disbursement - Advances To Suppliers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({
  path: 'cash-disbursement/advances-to-suppliers',
  version: '1',
})
export class AdvancesToSuppliersController {
  constructor(private readonly service: AdvancesToSuppliersService) {}

  @Get('lookups/parties')
  @ApiOperation({ summary: 'Get party options for Advances to Suppliers' })
  @ApiOkResponse({ description: 'List of active party options' })
  findParties(@CurrentUser() user: AuthUser) {
    return this.service.findParties(user);
  }

  @Get('lookups/responsibility-centers')
  @ApiOperation({ summary: 'Get responsibility center options for Advances to Suppliers' })
  @ApiOkResponse({ description: 'List of active responsibility centers' })
  findResponsibilityCenters(@CurrentUser() user: AuthUser) {
    return this.service.findResponsibilityCenters(user);
  }

  @Get('lookups/posting-accounts')
  @ApiOperation({ summary: 'Get posting chart of account options for Advances to Suppliers' })
  @ApiOkResponse({ description: 'List of active posting accounts' })
  findPostingAccounts(@CurrentUser() user: AuthUser) {
    return this.service.findPostingAccounts(user);
  }

  @Get('lookups/suggest-transaction-no')
  @ApiOperation({ summary: 'Suggest next Advances to Suppliers sequence number' })
  @ApiOkResponse({ description: 'Next transaction number' })
  suggestTransactionNo(@CurrentUser() user: AuthUser) {
    return this.service.suggestTransactionNumber(user);
  }

  @Get()
  @ApiOperation({ summary: 'List Advances to Suppliers records with pagination and filtering' })
  @ApiOkResponse({ type: AdvanceToSupplierListResponseDto })
  findAll(@CurrentUser() user: AuthUser, @Query() query: GetAdvanceToSupplierListQueryDto) {
    return this.service.findAll(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get Advances to Suppliers details by ID' })
  @ApiOkResponse({ type: AdvanceToSupplierResponseDto })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.findOne(user, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new Advances to Suppliers record' })
  @ApiCreatedResponse({ type: AdvanceToSupplierResponseDto })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateAdvanceToSupplierDto) {
    return this.service.create(user, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing Advances to Suppliers record' })
  @ApiOkResponse({ type: AdvanceToSupplierResponseDto })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateAdvanceToSupplierDto) {
    return this.service.update(user, id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update Advances to Suppliers status' })
  @ApiOkResponse({ type: AdvanceToSupplierResponseDto })
  updateStatus(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateAdvanceToSupplierStatusDto) {
    return this.service.updateStatus(user, id, dto);
  }

  @Post(':id/submit-approval')
  @ApiOperation({ summary: 'Submit Advances to Suppliers for approval' })
  @ApiOkResponse({ type: AdvanceToSupplierResponseDto })
  submitApproval(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.submitApproval(user, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete an Advances to Suppliers record' })
  @ApiOkResponse({ description: 'Deleted successfully' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.remove(user, id);
  }
}
