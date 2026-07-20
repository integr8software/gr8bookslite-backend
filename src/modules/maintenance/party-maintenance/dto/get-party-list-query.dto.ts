import { Transform } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { PartyClassification, PartyStatus, PartyType } from '@prisma/client';
import { toOptionalInt } from '../../../../common/utils/dto-transform.util';

export class GetPartyListQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  query?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsEnum(PartyClassification)
  classification?: PartyClassification;

  @IsOptional()
  @IsEnum(PartyType)
  partyType?: PartyType;

  @IsOptional()
  @IsEnum(PartyStatus)
  status?: PartyStatus;

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
  pageSize?: number;

  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;

  @IsOptional()
  @IsIn(['partyCodeNo', 'name', 'classification', 'partyTypes', 'address', 'status', 'createdAt', 'updatedAt'])
  sortBy?: 'partyCodeNo' | 'name' | 'classification' | 'partyTypes' | 'address' | 'status' | 'createdAt' | 'updatedAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDirection?: 'asc' | 'desc';
}
