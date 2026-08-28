import { Type } from 'class-transformer';
import { ArrayMinSize, IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { MembershipRole } from '@prisma/client';

export class WorkspaceUserAssignmentDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  companyId!: number;

  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @ArrayMinSize(1, {
    message: 'Select at least one head office, branch, or satellite.',
  })
  unitIds!: number[];

  @IsOptional()
  @IsEnum(MembershipRole)
  role?: MembershipRole;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  companyRoleId?: number | null;
}

