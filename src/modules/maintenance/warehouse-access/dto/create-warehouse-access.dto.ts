import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsEnum, IsInt, IsOptional, IsString, ValidateNested } from 'class-validator';
import { WarehouseAccessLevel, WarehouseAccessPermission, WarehouseAccessStatus } from '@prisma/client';

export class CreateWarehouseAccessAssignmentDto {
  @ApiProperty()
  @IsString()
  warehouseId!: string;

  @ApiProperty()
  @IsInt()
  userId!: number;

  @ApiPropertyOptional({ enum: WarehouseAccessLevel })
  @IsOptional()
  @IsEnum(WarehouseAccessLevel)
  accessLevel?: WarehouseAccessLevel;

  @ApiProperty({ enum: WarehouseAccessPermission, isArray: true })
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(WarehouseAccessPermission, { each: true })
  permissions!: WarehouseAccessPermission[];

  @ApiPropertyOptional({ enum: WarehouseAccessStatus })
  @IsOptional()
  @IsEnum(WarehouseAccessStatus)
  status?: WarehouseAccessStatus;
}

export class CreateWarehouseAccessDto {
  @ApiProperty({ type: [CreateWarehouseAccessAssignmentDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateWarehouseAccessAssignmentDto)
  assignments!: CreateWarehouseAccessAssignmentDto[];
}
