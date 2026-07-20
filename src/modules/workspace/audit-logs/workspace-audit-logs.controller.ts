import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RecordWorkspaceActivityDto } from './dto/record-workspace-activity.dto';
import { WorkspaceAuditLogResponseDto } from './dto/workspace-audit-log-response.dto';
import { getWorkspaceAuditLogRequestIpAddress } from './utils/workspace-audit-log-request.util';
import { WorkspaceAuditLogsService } from './workspace-audit-logs.service';

@UseGuards(JwtAuthGuard)
@ApiTags('Workspace Audit Logs')
@Controller({
  path: 'workspace/audit-logs',
  version: '1',
})
export class WorkspaceAuditLogsController {
  constructor(private readonly workspaceAuditLogsService: WorkspaceAuditLogsService) {}

  @Get()
  @ApiOkResponse({ type: [WorkspaceAuditLogResponseDto] })
  findAll(@CurrentUser() user: AuthUser) {
    return this.workspaceAuditLogsService.findAll(user);
  }

  @Post('activity')
  recordActivity(@CurrentUser() user: AuthUser, @Body() dto: RecordWorkspaceActivityDto, @Req() request: Request) {
    return this.workspaceAuditLogsService.recordActivity(user, {
      path: dto.path ?? '',
      module: dto.module ?? '',
      branchId: dto.branchId,
      branchName: dto.branchName,
      action: dto.action,
      description: dto.description,
      entityType: dto.entityType,
      entityId: dto.entityId,
      ipAddress: getWorkspaceAuditLogRequestIpAddress(request),
      userAgent: request.headers['user-agent'] ?? null,
    });
  }
}
