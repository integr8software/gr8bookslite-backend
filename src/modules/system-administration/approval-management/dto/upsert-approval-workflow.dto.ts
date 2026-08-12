import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsIn, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class UpsertApprovalWorkflowStageDto {
  @ApiProperty({ example: '39580d5f-27ae-47d0-a211-32da76557de6' })
  @IsOptional()
  @IsString()
  sourceApproverSetupId?: string;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sequence!: number;

  @ApiProperty({ example: 'Level 1: Maria Santos' })
  @IsString()
  name!: string;

  @ApiProperty({ enum: ['any', 'all'] })
  @IsIn(['any', 'all'])
  requirement!: 'any' | 'all';

  @ApiProperty({ type: [Number], example: [1, 2] })
  @IsArray()
  @ArrayMinSize(1)
  @Type(() => Number)
  @IsInt({ each: true })
  approverIds!: number[];
}

export class UpsertApprovalRoutingRuleDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sequence!: number;

  @ApiProperty({ example: 'Condition 1' })
  @IsString()
  name!: string;

  @ApiProperty({ enum: ['default', 'amount'] })
  @IsIn(['default', 'amount'])
  basis!: 'default' | 'amount';

  @ApiProperty({ enum: ['greaterThan', 'greaterThanOrEqual', 'lessThan', 'lessThanOrEqual'] })
  @IsIn(['greaterThan', 'greaterThanOrEqual', 'lessThan', 'lessThanOrEqual'])
  amountOperator!: string;

  @ApiPropertyOptional({ example: '10000' })
  @IsOptional()
  @IsString()
  amountValue?: string;

  @ApiProperty({ type: [Number], example: [1, 2], description: 'Approval stage sequence numbers included in this route.' })
  @IsArray()
  @ArrayMinSize(1)
  @Type(() => Number)
  @IsInt({ each: true })
  stageSequences!: number[];
}

export class UpsertApprovalWorkflowDto {
  @ApiProperty({ example: 'DV' })
  @IsString()
  moduleCode!: string;

  @ApiProperty({ example: 'Disbursement Voucher' })
  @IsString()
  moduleName!: string;

  @ApiProperty({ enum: ['Active', 'Inactive'] })
  @IsIn(['Active', 'Inactive'])
  status!: 'Active' | 'Inactive';

  @ApiPropertyOptional({ example: 'Disbursement vouchers use finance review by default.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ type: [UpsertApprovalWorkflowStageDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UpsertApprovalWorkflowStageDto)
  stages!: UpsertApprovalWorkflowStageDto[];

  @ApiProperty({ type: [UpsertApprovalRoutingRuleDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UpsertApprovalRoutingRuleDto)
  routingRules!: UpsertApprovalRoutingRuleDto[];
}
