import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { PettyCashFundStatus } from '@prisma/client';

export class UpdatePettyCashFundStatusDto {
  @ApiProperty({
    description: 'Target Petty Cash Fund status',
    enum: PettyCashFundStatus,
    example: PettyCashFundStatus.APPROVED,
  })
  @IsEnum(PettyCashFundStatus)
  status: PettyCashFundStatus;
}
