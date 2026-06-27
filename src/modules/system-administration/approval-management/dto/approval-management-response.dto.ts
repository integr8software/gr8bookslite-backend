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
