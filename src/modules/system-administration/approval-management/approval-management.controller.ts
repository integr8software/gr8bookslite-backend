import { Body, Controller, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ApprovalManagementService } from './approval-management.service';
import {
  ApprovalManagementModulesResponseDto,
  ApprovalTransactionResponseDto,
  ApprovalTransactionsResponseDto,
  ApprovalWorkflowResponseDto,
  ApprovalWorkflowsResponseDto,
  UpsertApprovalWorkflowResponseDto,
} from './dto/approval-management-response.dto';
import { UpsertApprovalWorkflowDto } from './dto/upsert-approval-workflow.dto';

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiTags('Approval Management')
@Controller({
  path: 'system-administration/approval-management',
  version: '1',
})
export class ApprovalManagementController {
  constructor(private readonly approvalManagement: ApprovalManagementService) {}

  @Get('modules')
  @Throttle({
    default: {
      limit: 120,
      ttl: 60_000,
    },
  })
  @ApiOkResponse({ type: ApprovalManagementModulesResponseDto })
  findModules() {
    return this.approvalManagement.findTransactionModules();
  }

  @Get('workflows')
  @Throttle({
    default: {
      limit: 120,
      ttl: 60_000,
    },
  })
  @ApiOperation({ summary: 'List approval workflows' })
  @ApiOkResponse({ type: ApprovalWorkflowsResponseDto })
  findWorkflows(@CurrentUser() user: AuthUser) {
    return this.approvalManagement.findWorkflows(user);
  }

  @Put('workflows/:moduleCode')
  @Throttle({
    default: {
      limit: 30,
      ttl: 60_000,
    },
  })
  @ApiOperation({ summary: 'Create or update an approval workflow' })
  @ApiParam({ name: 'moduleCode', type: String })
  @ApiBody({ type: UpsertApprovalWorkflowDto })
  @ApiOkResponse({ type: UpsertApprovalWorkflowResponseDto })
  upsertWorkflow(@CurrentUser() user: AuthUser, @Param('moduleCode') moduleCode: string, @Body() dto: UpsertApprovalWorkflowDto) {
    return this.approvalManagement.upsertWorkflow(user, moduleCode, dto);
  }

  @Patch('workflows/:workflowId/inactivate')
  @Throttle({
    default: {
      limit: 30,
      ttl: 60_000,
    },
  })
  @ApiOperation({ summary: 'Set an approval workflow as inactive' })
  @ApiParam({ name: 'workflowId', type: String })
  @ApiOkResponse({ type: ApprovalWorkflowResponseDto })
  inactivateWorkflow(@CurrentUser() user: AuthUser, @Param('workflowId') workflowId: string) {
    return this.approvalManagement.inactivateWorkflow(user, workflowId);
  }

  @Get('transactions')
  @Throttle({
    default: {
      limit: 120,
      ttl: 60_000,
    },
  })
  @ApiOperation({ summary: 'List approval transactions' })
  @ApiOkResponse({ type: ApprovalTransactionsResponseDto })
  findTransactions(@CurrentUser() user: AuthUser) {
    return this.approvalManagement.findTransactions(user);
  }

  @Post('transactions/:transactionId/approve')
  @Throttle({
    default: {
      limit: 30,
      ttl: 60_000,
    },
  })
  @ApiOperation({ summary: 'Approve an approval transaction' })
  @ApiParam({ name: 'transactionId', type: String })
  @ApiOkResponse({ type: ApprovalTransactionResponseDto })
  approveTransaction(@CurrentUser() user: AuthUser, @Param('transactionId') transactionId: string) {
    return this.approvalManagement.approveTransaction(user, transactionId);
  }

  @Post('transactions/:transactionId/disapprove')
  @Throttle({
    default: {
      limit: 30,
      ttl: 60_000,
    },
  })
  @ApiOperation({ summary: 'Disapprove an approval transaction' })
  @ApiParam({ name: 'transactionId', type: String })
  @ApiOkResponse({ type: ApprovalTransactionResponseDto })
  disapproveTransaction(@CurrentUser() user: AuthUser, @Param('transactionId') transactionId: string) {
    return this.approvalManagement.disapproveTransaction(user, transactionId);
  }
}
