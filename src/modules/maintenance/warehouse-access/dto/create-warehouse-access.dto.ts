import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsEnum, IsInt, IsOptional, IsString, ValidateNested } from 'class-validator';
import { WarehouseAccessLevel, WarehouseAccessPermission, WarehouseAccessStatus } from '@prisma/client';

export class CreateWarehouseAccessAssignmentDto {
  @IsString()
  warehouseId!: string;

  @IsInt()
  userId!: number;

  @IsOptional()
  @IsEnum(WarehouseAccessLevel)
  accessLevel?: WarehouseAccessLevel;

  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(WarehouseAccessPermission, { each: true })
  permissions!: WarehouseAccessPermission[];

  @IsOptional()
  @IsEnum(WarehouseAccessStatus)
  status?: WarehouseAccessStatus;
}

export class CreateWarehouseAccessDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateWarehouseAccessAssignmentDto)
  assignments!: CreateWarehouseAccessAssignmentDto[];
}
