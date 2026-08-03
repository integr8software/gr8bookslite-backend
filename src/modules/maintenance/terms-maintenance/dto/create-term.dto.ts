import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { TermDateMode, TermStatus } from '@prisma/client';

export class CreateTermDto {
  @ApiProperty({ maxLength: 150 })
  @IsString()
  @MaxLength(150)
  name!: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ enum: TermDateMode })
  @IsEnum(TermDateMode)
  dateMode!: TermDateMode;

  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  period!: number;

  @ApiPropertyOptional({ enum: TermStatus })
  @IsOptional()
  @IsEnum(TermStatus)
  status?: TermStatus;
}
