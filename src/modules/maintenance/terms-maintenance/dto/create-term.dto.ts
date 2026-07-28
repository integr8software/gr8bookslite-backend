import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { TermDateMode, TermStatus } from '@prisma/client';

export class CreateTermDto {
  @IsString()
  @MaxLength(150)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsEnum(TermDateMode)
  dateMode!: TermDateMode;

  @IsInt()
  @Min(0)
  period!: number;

  @IsOptional()
  @IsEnum(TermStatus)
  status?: TermStatus;
}
