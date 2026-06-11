import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ActivePermissionActions } from '../../../../common/constants/active-permission-actions.constant';

export class BranchRolePermissionDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  moduleCode!: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  moduleName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(160)
  permissionCode!: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  permissionName!: string;

  @IsOptional()
  @IsArray()
  @IsIn(ActivePermissionActions, { each: true })
  actions?: string[];

  @IsOptional()
  @IsBoolean()
  canView?: boolean;

  @IsOptional()
  @IsBoolean()
  canCreate?: boolean;

  @IsOptional()
  @IsBoolean()
  canUpdate?: boolean;

  @IsOptional()
  @IsBoolean()
  canCancel?: boolean;

  @IsOptional()
  @IsBoolean()
  canUncancel?: boolean;

  @IsOptional()
  @IsBoolean()
  canExport?: boolean;
}
