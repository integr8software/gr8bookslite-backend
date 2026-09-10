import { Transform } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ChartAccountStatus, DefaultAccountTemplateType } from '@prisma/client';
import { toOptionalInt } from '../../../../common/utils/dto-transform.util';

const CollectionTypeTemplateSortFields = ['name', 'description', 'type', 'status', 'createdAt', 'updatedAt'] as const;
const SortDirections = ['asc', 'desc'] as const;

export class GetCollectionTypeTemplateListQueryDto {
  @ApiPropertyOptional({ description: 'Search across collection type name, description, or generated account', maxLength: 120, example: 'tuition' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  // prettier-ignore
  @ApiPropertyOptional({ description: 'Default account template type filter', enum: DefaultAccountTemplateType, example: DefaultAccountTemplateType.COLLECTION })
  @IsOptional()
  @IsEnum(DefaultAccountTemplateType)
  type?: DefaultAccountTemplateType;

  @ApiPropertyOptional({ description: 'Collection type status filter', enum: ChartAccountStatus, example: ChartAccountStatus.ACTIVE })
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

  @ApiPropertyOptional({ description: 'Field to sort by', enum: CollectionTypeTemplateSortFields, default: 'name', example: 'name' })
  @IsOptional()
  @IsIn(CollectionTypeTemplateSortFields)
  sortBy?: 'name' | 'description' | 'type' | 'status' | 'createdAt' | 'updatedAt';

  @ApiPropertyOptional({ description: 'Sort direction', enum: SortDirections, default: 'asc', example: 'asc' })
  @IsOptional()
  @IsIn(SortDirections)
  sortDirection?: 'asc' | 'desc';
}
