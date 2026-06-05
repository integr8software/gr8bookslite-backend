import { IsBoolean } from 'class-validator';

export class UpdateBranchRoleStatusDto {
  @IsBoolean()
  isActive!: boolean;
}
