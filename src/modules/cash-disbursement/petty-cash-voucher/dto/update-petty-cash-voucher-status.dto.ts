import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { PettyCashVoucherStatus } from '@prisma/client';

export class UpdatePettyCashVoucherStatusDto {
  @ApiProperty({
    description: 'Target Petty Cash Voucher status',
    enum: PettyCashVoucherStatus,
    example: PettyCashVoucherStatus.APPROVED,
  })
  @IsEnum(PettyCashVoucherStatus)
  status: PettyCashVoucherStatus;
}
