import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator';

export class UpsertModuleSystemDto {
  @ApiPropertyOptional({ maxLength: 64, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  code?: string | null;

  @ApiProperty({ maxLength: 160 })
  @IsString()
  @MaxLength(160)
  name!: string;

  @ApiPropertyOptional({ maxLength: 1000, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @ApiPropertyOptional({ minimum: 0, type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateModuleSystemStatusDto {
  @ApiProperty()
  @IsBoolean()
  isActive!: boolean;
}

export class SaveModuleSystemModulesDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  moduleCodes!: string[];
}

export class ModuleSystemSidebarItemDto {
  @ApiPropertyOptional({ minimum: 1, nullable: true, type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id?: number | null;

  @ApiProperty({ maxLength: 120 })
  @IsString()
  @MaxLength(120)
  key!: string;

  @ApiProperty({ maxLength: 160 })
  @IsString()
  @MaxLength(160)
  label!: string;

  @ApiPropertyOptional({ maxLength: 500, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @ApiProperty({ enum: ['SECTION', 'CONTAINER', 'LINK'] })
  @IsIn(['SECTION', 'CONTAINER', 'LINK'])
  itemType!: 'SECTION' | 'CONTAINER' | 'LINK';

  @ApiPropertyOptional({ minimum: 1, nullable: true, type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  moduleId?: number | null;

  @ApiPropertyOptional({ maxLength: 120, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  moduleCode?: string | null;

  @ApiPropertyOptional({ maxLength: 120, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  iconName?: string | null;

  @ApiPropertyOptional({ minimum: 0, type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @ApiProperty({ type: () => [ModuleSystemSidebarItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ModuleSystemSidebarItemDto)
  children!: ModuleSystemSidebarItemDto[];
}

export class SaveModuleSystemSidebarDto {
  @ApiProperty({ type: () => [ModuleSystemSidebarItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ModuleSystemSidebarItemDto)
  items!: ModuleSystemSidebarItemDto[];
}
