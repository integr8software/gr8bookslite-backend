import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt, IsString, MaxLength, ValidateNested } from 'class-validator';
import { FormSignatoryRowDto } from './form-signatory-row.dto';

export class SaveFormSignatoryDto {
  @IsInt()
  unitId!: number;

  @IsString()
  @MaxLength(120)
  moduleCode!: string;

  @IsString()
  @MaxLength(160)
  moduleName!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => FormSignatoryRowDto)
  rows!: FormSignatoryRowDto[];
}
