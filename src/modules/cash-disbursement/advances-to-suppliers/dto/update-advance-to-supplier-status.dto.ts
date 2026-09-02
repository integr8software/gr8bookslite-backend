import { ApiProperty } from '@nestjs/swagger';
import { AdvanceToSupplierStatus } from '@prisma/client';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class UpdateAdvanceToSupplierStatusDto {
  @ApiProperty({ enum: AdvanceToSupplierStatus, example: AdvanceToSupplierStatus.FOR_APPROVAL })
  @IsEnum(AdvanceToSupplierStatus)
  @IsNotEmpty()
  status: AdvanceToSupplierStatus;
}
