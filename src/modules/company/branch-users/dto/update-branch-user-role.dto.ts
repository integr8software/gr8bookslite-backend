import { IsInt, IsOptional, Min } from 'class-validator';

export class UpdateBranchUserRoleDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  companyRoleId?: number | null;
}
