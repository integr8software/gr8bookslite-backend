import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator';

export class UpdateModuleFieldDto {
  @IsInt()
  @Min(1)
  id!: number;

  @IsBoolean()
  isVisible!: boolean;

  @IsBoolean()
  isRequired!: boolean;
}

export class SaveModuleFieldsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateModuleFieldDto)
  fields!: UpdateModuleFieldDto[];
}

export class CreateModuleFieldDto {
  @IsString()
  @MaxLength(120)
  label!: string;

  @IsString()
  @MaxLength(120)
  fieldKey!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  fieldType?: string;

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;
}
