import { ApiProperty } from '@nestjs/swagger';

export class WorkspaceUserCompanyAssignmentResponseDto {
  @ApiProperty()
  companyId!: number;

  @ApiProperty({ type: [Number] })
  unitIds!: number[];
}

export class WorkspaceUserResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ nullable: true })
  contactNumber!: string | null;

  @ApiProperty()
  status!: string;

  @ApiProperty({ nullable: true })
  lastLogin!: string | null;

  @ApiProperty({ nullable: true })
  profileImageUrl!: string | null;

  @ApiProperty({ type: [WorkspaceUserCompanyAssignmentResponseDto] })
  companyAssignments!: WorkspaceUserCompanyAssignmentResponseDto[];

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class WorkspaceUserMessageResponseDto {
  @ApiProperty()
  message!: string;
}

export class WorkspaceUserCancelInvitationResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  message!: string;
}
