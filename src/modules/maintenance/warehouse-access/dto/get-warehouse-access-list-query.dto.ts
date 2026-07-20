import { Transform } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { WarehouseAccessPermission, WarehouseAccessStatus } from '@prisma/client';
import { toOptionalInt } from '../../../../common/utils/dto-transform.util';

export class GetWarehouseAccessListQueryDto {
  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsEnum(WarehouseAccessStatus)
  status?: WarehouseAccessStatus;

  @IsOptional()
  @IsEnum(WarehouseAccessPermission)
  permission?: WarehouseAccessPermission;

  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  branchUnitId?: number;

  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;

  @IsOptional()
  @IsIn(['warehouse', 'user', 'accessLevel', 'status', 'createdAt', 'updatedAt'])
  sortBy?: 'warehouse' | 'user' | 'accessLevel' | 'status' | 'createdAt' | 'updatedAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDirection?: 'asc' | 'desc';
}
