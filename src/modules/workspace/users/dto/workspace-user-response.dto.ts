import { ApiProperty } from '@nestjs/swagger';
import { CompanyUnitType } from '@prisma/client';

export class WorkspaceUserAssignedUnitResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  companyId!: number;

  @ApiProperty({ enum: CompanyUnitType })
  type!: CompanyUnitType;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true })
  displayName!: string | null;

  @ApiProperty()
  isActive!: boolean;
}

export class WorkspaceUserCompanyAssignmentResponseDto {
  @ApiProperty()
  companyId!: number;

  @ApiProperty({ type: [Number] })
  unitIds!: number[];

  @ApiProperty({ type: [WorkspaceUserAssignedUnitResponseDto] })
  units!: WorkspaceUserAssignedUnitResponseDto[];
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

  @ApiProperty({ nullable: true })
  updatedAt!: Date | null;
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
