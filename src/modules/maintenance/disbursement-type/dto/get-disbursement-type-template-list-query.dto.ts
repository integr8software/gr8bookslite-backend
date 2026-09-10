import { Transform } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ChartAccountStatus, DefaultAccountTemplateType } from '@prisma/client';
import { toOptionalInt } from '../../../../common/utils/dto-transform.util';

const DisbursementTypeTemplateSortFields = ['name', 'description', 'type', 'status', 'createdAt', 'updatedAt'] as const;
const SortDirections = ['asc', 'desc'] as const;

export class GetDisbursementTypeTemplateListQueryDto {
  @ApiPropertyOptional({ description: 'Search across disbursement type name, description, or generated account', maxLength: 120, example: 'supplies' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ description: 'Default account template type filter', enum: DefaultAccountTemplateType, example: DefaultAccountTemplateType.EXPENSE })
  @IsOptional()
  @IsEnum(DefaultAccountTemplateType)
  type?: DefaultAccountTemplateType;

  @ApiPropertyOptional({ description: 'Disbursement type status filter', enum: ChartAccountStatus, example: ChartAccountStatus.ACTIVE })
  @IsOptional()
  @IsEnum(ChartAccountStatus)
  status?: ChartAccountStatus;

  @ApiPropertyOptional({ description: 'Page number', minimum: 1, default: 1, example: 1 })
  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', minimum: 1, maximum: 500, default: 50, example: 10 })
  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;

  @ApiPropertyOptional({ description: 'Field to sort by', enum: DisbursementTypeTemplateSortFields, default: 'name', example: 'name' })
  @IsOptional()
  @IsIn(DisbursementTypeTemplateSortFields)
  sortBy?: 'name' | 'description' | 'type' | 'status' | 'createdAt' | 'updatedAt';

  @ApiPropertyOptional({ description: 'Sort direction', enum: SortDirections, default: 'asc', example: 'asc' })
  @IsOptional()
  @IsIn(SortDirections)
  sortDirection?: 'asc' | 'desc';
}
