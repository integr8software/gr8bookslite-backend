import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ApproverSetupsService } from './approver-setups.service';
import {
  ApproverSetupModulesResponse,
  ApproverSetupsPaginatedResponse,
  ApproverSetupUserResponse,
  CreateApproverSetupResponse,
} from './types/approver-setup-response.type';
import { CreateApproverSetupDto } from './dto/create-approver-setup.dto';
import { GetApproverSetupsQueryDto, GetApproverSetupUsersQueryDto } from './dto/get-approver-setups-query.dto';

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiTags('Approver Setups')
@Controller({
  path: 'approver-setups',
  version: '1',
})
export class ApproverSetupsController {
  constructor(private readonly approverSetupsService: ApproverSetupsService) {}

  @Get('modules')
  @Throttle({
    default: {
      limit: 120,
      ttl: 60_000,
    },
  })
  @ApiOperation({
    summary: 'List modules for approver setup',
    description: 'Returns active transaction modules available for approver assignment scope controls.',
  })
  @ApiOkResponse({ description: 'Approver setup modules returned.' })
  findModules(): Promise<ApproverSetupModulesResponse> {
    return this.approverSetupsService.findModules();
  }

  @Get('users')
  @Throttle({
    default: {
      limit: 120,
      ttl: 60_000,
    },
  })
  @ApiOperation({
    summary: 'List company users for approver setup',
    description: 'Returns users that belong to the active company context for approver checklist controls.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 100 })
  @ApiQuery({ name: 'search', required: false, type: String, example: 'test' })
  @ApiOkResponse({ description: 'Company users returned.' })
  findCompanyUsers(@CurrentUser() user: AuthUser, @Query() query: GetApproverSetupUsersQueryDto): Promise<ApproverSetupUserResponse[]> {
    return this.approverSetupsService.findCompanyUsers(user, query);
  }

  @Post()
  @Throttle({
    default: {
      limit: 30,
      ttl: 60_000,
    },
  })
  @ApiOperation({ summary: 'Create an approver setup' })
  @ApiBody({ type: CreateApproverSetupDto })
  @ApiCreatedResponse({ description: 'Approver setup created.' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateApproverSetupDto): Promise<CreateApproverSetupResponse> {
    return this.approverSetupsService.create(user, dto);
  }

  @Put(':setupId')
  @Throttle({
    default: {
      limit: 30,
      ttl: 60_000,
    },
  })
  @ApiOperation({ summary: 'Update an approver setup' })
  @ApiParam({ name: 'setupId', type: String })
  @ApiBody({ type: CreateApproverSetupDto })
  @ApiOkResponse({ description: 'Approver setup updated.' })
  update(@CurrentUser() user: AuthUser, @Param('setupId') setupId: string, @Body() dto: CreateApproverSetupDto): Promise<CreateApproverSetupResponse> {
    return this.approverSetupsService.update(user, setupId, dto);
  }

  @Patch(':setupId/status')
  @Throttle({
    default: {
      limit: 30,
      ttl: 60_000,
    },
  })
  @ApiOperation({ summary: 'Update approver setup status' })
  @ApiParam({ name: 'setupId', type: String })
  @ApiOkResponse({ description: 'Approver setup status updated.' })
  updateStatus(@CurrentUser() user: AuthUser, @Param('setupId') setupId: string, @Body() body: { status: string }): Promise<CreateApproverSetupResponse> {
    return this.approverSetupsService.updateStatus(user, setupId, body.status);
  }

  @Delete(':setupId')
  @Throttle({
    default: {
      limit: 30,
      ttl: 60_000,
    },
  })
  @ApiOperation({ summary: 'Delete an approver setup' })
  @ApiParam({ name: 'setupId', type: String })
  @ApiOkResponse({ description: 'Approver setup deleted.' })
  remove(@CurrentUser() user: AuthUser, @Param('setupId') setupId: string) {
    return this.approverSetupsService.remove(user, setupId);
  }

  @Get()
  @Throttle({
    default: {
      limit: 120,
      ttl: 60_000,
    },
  })
  @ApiOperation({ summary: 'List approver setups' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiOkResponse({ description: 'Approver setups returned.' })
  findAll(@CurrentUser() user: AuthUser, @Query() query: GetApproverSetupsQueryDto): Promise<ApproverSetupsPaginatedResponse> {
    return this.approverSetupsService.findAll(user, query);
  }
}
