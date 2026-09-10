import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DefaultAccountTemplateType } from '@prisma/client';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateChartAccountDto } from '../chart-of-accounts/dto/create-chart-account.dto';
import {
  DisbursementTypeContainerResponseDto,
  DisbursementTypeAccountOptionsResponseDto,
  DisbursementTypeExpenseParentOptionsResponseDto,
  DisbursementTypeListResponseDto,
  DisbursementTypeOptionsResponseDto,
  SaveDisbursementTypeExpenseSubAccountResponseDto,
  SaveDisbursementTypeResponseDto,
} from '../disbursement-type/dto/disbursement-type-response.dto';
import { CreateDisbursementTypeTemplateDto } from '../disbursement-type/dto/create-disbursement-type-template.dto';
import { DisbursementTypeOptionQueryDto } from '../disbursement-type/dto/disbursement-type-option-query.dto';
import { GetDisbursementTypeTemplateListQueryDto } from '../disbursement-type/dto/get-disbursement-type-template-list-query.dto';
import { UpdateDisbursementTypeTemplateDto } from '../disbursement-type/dto/update-disbursement-type-template.dto';
import { UpdateDisbursementTypeTemplateStatusDto } from '../disbursement-type/dto/update-disbursement-type-template-status.dto';
import { DisbursementTypeService, DisbursementTypeModuleCode } from './disbursement-type.service';

const DisbursementTypeContext = {
  moduleCode: DisbursementTypeModuleCode,
  type: DefaultAccountTemplateType.EXPENSE,
  label: 'disbursement types',
};

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiTags('Disbursement Type Maintenance')
@Controller({
  path: 'maintenance/financial-management/disbursement-types',
  version: '1',
})
export class DisbursementTypeController {
  constructor(private readonly disbursementTypeService: DisbursementTypeService) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated list of disbursement type records' })
  @ApiOkResponse({ type: DisbursementTypeListResponseDto })
  findAll(@CurrentUser() user: AuthUser, @Query() query: GetDisbursementTypeTemplateListQueryDto) {
    return this.disbursementTypeService.findAll(user, query, DisbursementTypeContext);
  }

  @Get('options')
  @ApiOperation({ summary: 'Get disbursement type options' })
  @ApiOkResponse({ type: DisbursementTypeOptionsResponseDto })
  findOptions(@CurrentUser() user: AuthUser, @Query() query: DisbursementTypeOptionQueryDto) {
    return this.disbursementTypeService.findExpenseOptions(user, query);
  }

  @Get('expense-parent-options')
  @ApiOperation({ summary: 'Get disbursement type expense parent account options' })
  @ApiOkResponse({ type: DisbursementTypeExpenseParentOptionsResponseDto })
  findExpenseParentOptions(@CurrentUser() user: AuthUser) {
    return this.disbursementTypeService.findExpenseParentOptions(user, DisbursementTypeContext);
  }

  @Get('account-options')
  @ApiOperation({ summary: 'Get disbursement type expense account options' })
  @ApiOkResponse({ type: DisbursementTypeAccountOptionsResponseDto })
  findAccountOptions(@CurrentUser() user: AuthUser) {
    return this.disbursementTypeService.findAccountOptions(user, DisbursementTypeContext);
  }

  @Post('expense-sub-accounts')
  @ApiOperation({ summary: 'Create a disbursement type expense sub-account' })
  @ApiCreatedResponse({ type: SaveDisbursementTypeExpenseSubAccountResponseDto })
  createExpenseSubAccount(@CurrentUser() user: AuthUser, @Body() dto: CreateChartAccountDto) {
    return this.disbursementTypeService.createExpenseSubAccount(user, dto, DisbursementTypeContext);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get disbursement type details by ID' })
  @ApiOkResponse({ type: DisbursementTypeContainerResponseDto })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.disbursementTypeService.findOne(user, id, DisbursementTypeContext);
  }

  @Post()
  @ApiOperation({ summary: 'Create a disbursement type record' })
  @ApiCreatedResponse({ type: SaveDisbursementTypeResponseDto })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateDisbursementTypeTemplateDto) {
    return this.disbursementTypeService.create(user, dto, DisbursementTypeContext);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a disbursement type record' })
  @ApiOkResponse({ type: SaveDisbursementTypeResponseDto })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateDisbursementTypeTemplateDto) {
    return this.disbursementTypeService.update(user, id, dto, DisbursementTypeContext);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update disbursement type status' })
  @ApiOkResponse({ type: SaveDisbursementTypeResponseDto })
  updateStatus(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateDisbursementTypeTemplateStatusDto) {
    return this.disbursementTypeService.updateStatus(user, id, dto, DisbursementTypeContext);
  }
}
