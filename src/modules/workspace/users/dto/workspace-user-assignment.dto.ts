import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsEnum, IsInt, IsOptional, Min, ValidateNested } from 'class-validator';
import { MembershipRole } from '@prisma/client';

export class WorkspaceUserUnitAssignmentDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  unitId!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  companyRoleId?: number | null;
}

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
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkspaceUserUnitAssignmentDto)
  unitAssignments?: WorkspaceUserUnitAssignmentDto[];

  @IsOptional()
  @IsEnum(MembershipRole)
  role?: MembershipRole;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  companyRoleId?: number | null;
}


