import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class GetPurchaseOrderCopyFromCandidatesQueryDto {
  @ApiPropertyOptional({ description: 'Branch Unit ID', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  branchUnitId?: number;

  @ApiPropertyOptional({ description: 'Supplier party primary key ID', example: '1' })
  @IsOptional()
  @IsString()
  partyId?: string;

  @ApiPropertyOptional({ description: 'Supplier party code', example: 'SUP-0001' })
  @IsOptional()
  @IsString()
  partyCode?: string;

  @ApiPropertyOptional({ description: 'Search by PO number, supplier, project, or remarks' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
