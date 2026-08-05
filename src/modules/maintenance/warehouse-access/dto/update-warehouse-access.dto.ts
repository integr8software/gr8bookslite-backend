import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsEnum, IsOptional } from 'class-validator';
import { WarehouseAccessLevel, WarehouseAccessPermission, WarehouseAccessStatus } from '@prisma/client';

export class UpdateWarehouseAccessDto {
  @ApiPropertyOptional({ enum: WarehouseAccessLevel })
  @IsOptional()
  @IsEnum(WarehouseAccessLevel)
  accessLevel?: WarehouseAccessLevel;

  @ApiPropertyOptional({ enum: WarehouseAccessPermission, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(WarehouseAccessPermission, { each: true })
  permissions?: WarehouseAccessPermission[];

  @ApiPropertyOptional({ enum: WarehouseAccessStatus })
  @IsOptional()
  @IsEnum(WarehouseAccessStatus)
  status?: WarehouseAccessStatus;
}
