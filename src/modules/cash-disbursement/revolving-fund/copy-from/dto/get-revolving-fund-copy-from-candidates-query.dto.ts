import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { toOptionalInt } from '../../../../../common/utils/dto-transform.util';

export class GetRevolvingFundCopyFromCandidatesQueryDto {
  @ApiPropertyOptional({ description: 'Search term across transaction number, party, or remarks', example: 'RF-2026' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ description: 'Branch unit ID filter', example: 1 })
  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  branchUnitId?: number;

  @ApiPropertyOptional({ description: 'Party primary key ID', example: '1' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  partyId?: string;

  @ApiPropertyOptional({ description: 'Party code filter', example: 'EMP-001' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  partyCode?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1, example: 1 })
  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Limit per page', default: 10, example: 10 })
  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}
