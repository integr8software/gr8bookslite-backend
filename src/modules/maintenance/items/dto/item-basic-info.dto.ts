import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayUnique, IsArray, IsEnum, IsNotEmpty, IsString, Matches, MaxLength, ValidateIf } from 'class-validator';

export enum ItemBasicInfoStatus { ACTIVE = 'ACTIVE', INACTIVE = 'INACTIVE' }
const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value;

export class CreateItemBasicInfoDto {
  @ApiProperty({ maxLength: 50 })
  @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(50)
  code!: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @ValidateIf((_o, value) => value !== undefined) @Transform(trim) @IsString() @MaxLength(100)
  skuCode?: string;

  @ApiProperty({ maxLength: 150 })
  @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(150)
  name!: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @ValidateIf((_o, value) => value !== undefined) @Transform(trim) @IsString() @MaxLength(100)
  barcode?: string;

  @ApiProperty({ pattern: '^[1-9][0-9]*$' })
  @IsString() @Matches(/^[1-9][0-9]*$/)
  categoryId!: string;

  @ApiProperty({ pattern: '^[1-9][0-9]*$' })
  @IsString() @Matches(/^[1-9][0-9]*$/)
  unitOfMeasurementId!: string;

  @ApiPropertyOptional({ maxLength: 150 })
  @ValidateIf((_o, value) => value !== undefined) @Transform(trim) @IsString() @MaxLength(150)
  brand?: string;

  @ApiPropertyOptional({ maxLength: 150 })
  @ValidateIf((_o, value) => value !== undefined) @Transform(trim) @IsString() @MaxLength(150)
  model?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @ValidateIf((_o, value) => value !== undefined) @Transform(trim) @IsString() @MaxLength(100)
  externalReferenceCode?: string;

  @ApiPropertyOptional({ type: String, nullable: true, pattern: '^[1-9][0-9]*$' })
  @ValidateIf((_o, value) => value !== undefined && value !== null) @IsString() @Matches(/^[1-9][0-9]*$/)
  responsibilityCenterId?: string | null;

  @ApiPropertyOptional({ maxLength: 500 })
  @ValidateIf((_o, value) => value !== undefined) @Transform(trim) @IsString() @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ type: [String], maxItems: 50, description: 'JSON array of unique tag strings.' })
  @ValidateIf((_o, value) => value !== undefined)
  @Transform(({ value }: { value: unknown }) => Array.isArray(value) ? value.map((tag: unknown) => typeof tag === 'string' ? tag.trim() : tag) : value)
  @IsArray() @ArrayMaxSize(50) @ArrayUnique((tag: unknown) => typeof tag === 'string' ? tag.toLowerCase() : tag)
  @IsString({ each: true }) @IsNotEmpty({ each: true }) @MaxLength(50, { each: true })
  tags?: string[];

  @ApiPropertyOptional({ enum: ItemBasicInfoStatus })
  @ValidateIf((_o, value) => value !== undefined) @IsEnum(ItemBasicInfoStatus)
  status?: ItemBasicInfoStatus;
}

export class UpdateItemBasicInfoDto extends PartialType(CreateItemBasicInfoDto, { skipNullProperties: false }) {}

export class ItemBasicInfoResponseDto extends CreateItemBasicInfoDto {
  @ApiProperty() id!: string;
  @ApiProperty() categoryName!: string;
  @ApiProperty() unitOfMeasurementSymbol!: string;
  @ApiProperty() responsibilityCenterName!: string;
  @ApiPropertyOptional({ type: Number }) costPrice?: number;
  @ApiPropertyOptional({ type: Number }) sellingPrice?: number;
  @ApiPropertyOptional({ type: Number }) suggestedPrice?: number;
  @ApiPropertyOptional({ type: String, nullable: true }) taxTreatment?: string | null;
}

export class ItemBasicInfoListResponseDto {
  @ApiProperty({ type: [ItemBasicInfoResponseDto] }) items!: ItemBasicInfoResponseDto[];
}
