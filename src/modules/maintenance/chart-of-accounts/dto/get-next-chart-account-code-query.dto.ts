import { Transform } from 'class-transformer';
import { IsEnum, IsOptional } from 'class-validator';
import { ChartAccountLevel } from '@prisma/client';
import { normalizeOptionalQueryString } from '../../../../common/utils/dto-transform.util';

export class GetNextChartAccountCodeQueryDto {
  @IsOptional()
  @Transform(({ value }) => normalizeOptionalQueryString(value))
  parentAccountId?: string;

  @IsEnum(ChartAccountLevel)
  accountLevel!: ChartAccountLevel;
}
