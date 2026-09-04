import { ApiProperty } from '@nestjs/swagger';

export class ApprovalManagementModuleResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;
}

export class ApprovalManagementModulesResponseDto {
  @ApiProperty({ type: [ApprovalManagementModuleResponseDto] })
  modules!: ApprovalManagementModuleResponseDto[];
}

export class ApprovalWorkflowStageResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  sequence!: number;

  @ApiProperty()
  name!: string;

  @ApiProperty({ type: [Number] })
  approverIds!: number[];

  @ApiProperty()
  requirement!: string;
}

export class ApprovalRoutingRuleResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  sequence!: number;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  basis!: string;

  @ApiProperty()
  amountOperator!: string;

  @ApiProperty()
  amountValue!: string;

  @ApiProperty({ type: [String] })
  stageIds!: string[];
}

export class ApprovalWorkflowResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  moduleCode!: string;

  @ApiProperty()
  moduleName!: string;

  @ApiProperty()
  stageCount!: number;

  @ApiProperty({ type: [ApprovalWorkflowStageResponseDto] })
  stages!: ApprovalWorkflowStageResponseDto[];

  @ApiProperty({ type: [ApprovalRoutingRuleResponseDto] })
  routingRules!: ApprovalRoutingRuleResponseDto[];

  @ApiProperty()
  status!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty()
  updatedAt!: Date;
}

export class ApprovalWorkflowsResponseDto {
  @ApiProperty({ type: [ApprovalWorkflowResponseDto] })
  workflows!: ApprovalWorkflowResponseDto[];
}

export class UpsertApprovalWorkflowResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: ApprovalWorkflowResponseDto })
  workflow!: ApprovalWorkflowResponseDto;
}

export class ApprovalTransactionApproverResponseDto {
  @ApiProperty()
  userId!: number;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  sequence!: number;

  @ApiProperty()
  status!: string;

  @ApiProperty({ required: false, nullable: true })
  approvedAt!: Date | null;

  @ApiProperty({ required: false, nullable: true })
  remarks!: string | null;
}

export class ApprovalTransactionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  moduleScope!: string;

  @ApiProperty()
  moduleName!: string;

  @ApiProperty()
  referenceNo!: string;

  @ApiProperty()
  remarks!: string;

  @ApiProperty()
  ruleId!: string;

  @ApiProperty()
  ruleName!: string;

  @ApiProperty()
  amount!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  requestedAt!: Date;

  @ApiProperty()
  canUpdateStatus!: boolean;

  @ApiProperty({
    description: 'Whether approvers must act in sequence for this transaction.',
  })
  isSequential!: boolean;

  @ApiProperty({ required: false, nullable: true })
  blockerName!: string | null;

  @ApiProperty({ required: false, nullable: true })
  currentApproverId!: number | null;

  @ApiProperty({ type: [ApprovalTransactionApproverResponseDto] })
  approvers!: ApprovalTransactionApproverResponseDto[];
}

export class ApprovalTransactionsResponseDto {
  @ApiProperty({ type: [ApprovalTransactionResponseDto] })
  transactions!: ApprovalTransactionResponseDto[];
}
