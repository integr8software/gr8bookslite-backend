import { ArrayNotEmpty, IsArray, IsEnum, IsOptional } from 'class-validator';
import { WarehouseAccessLevel, WarehouseAccessPermission, WarehouseAccessStatus } from '@prisma/client';

export class UpdateWarehouseAccessDto {
  @IsOptional()
  @IsEnum(WarehouseAccessLevel)
  accessLevel?: WarehouseAccessLevel;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(WarehouseAccessPermission, { each: true })
  permissions?: WarehouseAccessPermission[];

  @IsOptional()
  @IsEnum(WarehouseAccessStatus)
  status?: WarehouseAccessStatus;
}
