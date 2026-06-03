import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { BranchRolePermissionDto } from './branch-role-permission.dto';

export class CreateBranchRoleDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @IsArray()
  @ArrayMinSize(1, { message: 'Select at least one module permission.' })
  @ValidateNested({ each: true })
  @Type(() => BranchRolePermissionDto)
  permissions!: BranchRolePermissionDto[];
}
