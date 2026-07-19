import { Transform } from 'class-transformer';
import { ArrayUnique, IsArray, IsEnum, IsInt, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';
import { WarehouseBranchAvailabilityMode, WarehouseStatus } from '@prisma/client';

function toOptionalUnitIds(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const values = Array.isArray(value) ? value : [value];

  return values.map((item) => Number(item));
}

export class CreateWarehouseDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  code?: string;

  @IsString()
  @Matches(/\S/, { message: 'name must not be empty' })
  @MaxLength(180)
  name!: string;

  @IsOptional()
  @Transform(({ value }) => toOptionalUnitIds(value))
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  branchUnitIds?: number[];

  @IsOptional()
  @IsEnum(WarehouseBranchAvailabilityMode)
  branchAvailabilityMode?: WarehouseBranchAvailabilityMode;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  managerName?: string;

  @IsOptional()
  @IsEnum(WarehouseStatus)
  status?: WarehouseStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  contactNo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
