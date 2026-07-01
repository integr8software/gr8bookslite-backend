import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ApprovalManagementService } from './approval-management.service';
import { ApprovalManagementModulesResponseDto } from './dto/approval-management-response.dto';

@UseGuards(JwtAuthGuard)
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
}
