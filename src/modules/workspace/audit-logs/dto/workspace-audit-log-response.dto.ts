import { ApiProperty } from '@nestjs/swagger';

export class WorkspaceAuditLogResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ nullable: true })
  companyId: number | null;

  @ApiProperty({ nullable: true })
  companyName: string | null;

  @ApiProperty({ nullable: true })
  actorUserId: number | null;

  @ApiProperty()
  actorName: string;

  @ApiProperty()
  actorRole: string;

  @ApiProperty()
  action: string;

  @ApiProperty()
  entityType: string;

  @ApiProperty({ nullable: true })
  entityId: string | null;

  @ApiProperty()
  description: string;

  @ApiProperty({ nullable: true })
  ipAddress: string | null;

  @ApiProperty()
  module: string;

  @ApiProperty()
  branchId: string;

  @ApiProperty()
  branchName: string;

  @ApiProperty()
  severity: string;

  @ApiProperty()
  createdAt: string;
}
