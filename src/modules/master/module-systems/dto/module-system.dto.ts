import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class UpsertModuleSystemDto {
  @IsString()
  @MaxLength(64)
  code!: string;

  @IsString()
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateModuleSystemStatusDto {
  @IsBoolean()
  isActive!: boolean;
}

export class SaveModuleSystemModulesDto {
  @IsArray()
  @IsString({ each: true })
  moduleCodes!: string[];
}

export class ModuleSystemSidebarItemDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id?: number | null;

  @IsString()
  @MaxLength(120)
  key!: string;

  @IsString()
  @MaxLength(160)
  label!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @IsIn(['SECTION', 'CONTAINER', 'LINK'])
  itemType!: 'SECTION' | 'CONTAINER' | 'LINK';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  moduleId?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  moduleCode?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  iconName?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ModuleSystemSidebarItemDto)
  children!: ModuleSystemSidebarItemDto[];
}

export class SaveModuleSystemSidebarDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ModuleSystemSidebarItemDto)
  items!: ModuleSystemSidebarItemDto[];
}
