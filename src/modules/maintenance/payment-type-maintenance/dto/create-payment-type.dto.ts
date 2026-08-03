import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { PaymentTypeClassification, PaymentTypeStatus } from '@prisma/client';

export class CreatePaymentTypeDto {
  @ApiProperty({ maxLength: 150 })
  @IsString()
  @MaxLength(150)
  name!: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ enum: PaymentTypeClassification })
  @IsEnum(PaymentTypeClassification)
  classification!: PaymentTypeClassification;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ enum: PaymentTypeStatus })
  @IsOptional()
  @IsEnum(PaymentTypeStatus)
  status?: PaymentTypeStatus;
}
