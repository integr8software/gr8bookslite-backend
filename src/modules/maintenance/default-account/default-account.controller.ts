import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { DefaultAccountService } from './default-account.service';
import { CreateChartAccountDto } from '../chart-of-accounts/dto/create-chart-account.dto';
import { CreateDefaultAccountTemplateDto } from './dto/create-default-account-template.dto';
import { GetDefaultAccountTemplateListQueryDto } from './dto/get-default-account-template-list-query.dto';
import { UpdateDefaultAccountTemplateStatusDto } from './dto/update-default-account-template-status.dto';
import { UpdateDefaultAccountTemplateDto } from './dto/update-default-account-template.dto';
import {
  DefaultAccountContainerResponseDto,
  DefaultAccountExpenseParentOptionsResponseDto,
  DefaultAccountListResponseDto,
  SaveDefaultAccountExpenseSubAccountResponseDto,
  SaveDefaultAccountResponseDto,
} from './dto/default-account-response.dto';

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiTags('Default Account')
@Controller({
  path: 'maintenance/financial-management/default-accounts',
  version: '1',
})
export class DefaultAccountController {
  constructor(private readonly defaultAccountService: DefaultAccountService) {}

  @Get()
  @ApiOkResponse({ type: DefaultAccountListResponseDto })
  findAll(@CurrentUser() user: AuthUser, @Query() query: GetDefaultAccountTemplateListQueryDto) {
    return this.defaultAccountService.findAll(user, query);
  }

  @Get('expense-parent-options')
  @ApiOkResponse({ type: DefaultAccountExpenseParentOptionsResponseDto })
  findExpenseParentOptions(@CurrentUser() user: AuthUser) {
    return this.defaultAccountService.findExpenseParentOptions(user);
  }

  @Post('expense-sub-accounts')
  @ApiCreatedResponse({ type: SaveDefaultAccountExpenseSubAccountResponseDto })
  createExpenseSubAccount(@CurrentUser() user: AuthUser, @Body() dto: CreateChartAccountDto) {
    return this.defaultAccountService.createExpenseSubAccount(user, dto);
  }

  @Get(':id')
  @ApiOkResponse({ type: DefaultAccountContainerResponseDto })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.defaultAccountService.findOne(user, id);
  }

  @Post()
  @ApiCreatedResponse({ type: SaveDefaultAccountResponseDto })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateDefaultAccountTemplateDto) {
    return this.defaultAccountService.create(user, dto);
  }

  @Patch(':id')
  @ApiOkResponse({ type: SaveDefaultAccountResponseDto })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateDefaultAccountTemplateDto) {
    return this.defaultAccountService.update(user, id, dto);
  }

  @Patch(':id/status')
  @ApiOkResponse({ type: SaveDefaultAccountResponseDto })
  updateStatus(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateDefaultAccountTemplateStatusDto) {
    return this.defaultAccountService.updateStatus(user, id, dto);
  }
}
