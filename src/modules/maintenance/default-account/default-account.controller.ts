import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { DefaultAccountService } from './default-account.service';
import { CreateDefaultAccountTemplateDto } from './dto/create-default-account-template.dto';
import { GetDefaultAccountTemplateListQueryDto } from './dto/get-default-account-template-list-query.dto';
import { UpdateDefaultAccountTemplateStatusDto } from './dto/update-default-account-template-status.dto';
import { UpdateDefaultAccountTemplateDto } from './dto/update-default-account-template.dto';

@UseGuards(JwtAuthGuard)
@ApiTags('Default Account')
@Controller({
  path: 'maintenance/financial-management/default-accounts',
  version: '1',
})
export class DefaultAccountController {
  constructor(private readonly defaultAccountService: DefaultAccountService) {}

  @Get()
  @ApiOkResponse({ description: 'Default accounts retrieved.' })
  findAll(
    @CurrentUser() user: AuthUser,
    @Query() query: GetDefaultAccountTemplateListQueryDto,
  ) {
    return this.defaultAccountService.findAll(user, query);
  }

  @Get('expense-parent-options')
  @ApiOkResponse({ description: 'Expense parent account options retrieved.' })
  findExpenseParentOptions(@CurrentUser() user: AuthUser) {
    return this.defaultAccountService.findExpenseParentOptions(user);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Default account retrieved.' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.defaultAccountService.findOne(user, id);
  }

  @Post()
  @ApiCreatedResponse({ description: 'Default account created.' })
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateDefaultAccountTemplateDto,
  ) {
    return this.defaultAccountService.create(user, dto);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Default account updated.' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateDefaultAccountTemplateDto,
  ) {
    return this.defaultAccountService.update(user, id, dto);
  }

  @Patch(':id/status')
  @ApiOkResponse({ description: 'Default account status updated.' })
  updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateDefaultAccountTemplateStatusDto,
  ) {
    return this.defaultAccountService.updateStatus(user, id, dto);
  }
}
