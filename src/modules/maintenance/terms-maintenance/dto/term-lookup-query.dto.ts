import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { TermDateMode } from '@prisma/client';

export class TermLookupQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsEnum(TermDateMode)
  dateMode?: TermDateMode;
}
