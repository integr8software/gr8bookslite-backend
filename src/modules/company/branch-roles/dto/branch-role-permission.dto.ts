import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class BranchRolePermissionDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  moduleCode!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  moduleName!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  permissionCode!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  permissionName!: string;

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
  canDelete?: boolean;

  @IsOptional()
  @IsBoolean()
  canApprove?: boolean;

  @IsOptional()
  @IsBoolean()
  canExport?: boolean;
}
