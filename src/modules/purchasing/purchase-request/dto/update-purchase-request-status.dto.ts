import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { PurchaseRequestStatus } from '@prisma/client';

export class UpdatePurchaseRequestStatusDto {
  @ApiProperty({ enum: PurchaseRequestStatus })
  @IsEnum(PurchaseRequestStatus)
  status!: PurchaseRequestStatus;
}
