import { ApiProperty } from '@nestjs/swagger';
import { CashVoucherStatus } from '@prisma/client';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class UpdateCashVoucherStatusDto {
  @ApiProperty({ description: 'New voucher status', enum: CashVoucherStatus, example: CashVoucherStatus.FOR_APPROVAL })
  @IsEnum(CashVoucherStatus)
  @IsNotEmpty()
  status: CashVoucherStatus;
}
