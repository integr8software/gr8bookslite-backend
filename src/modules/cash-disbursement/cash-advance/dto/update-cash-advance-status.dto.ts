import { ApiProperty } from '@nestjs/swagger';
import { CashAdvanceStatus } from '@prisma/client';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class UpdateCashAdvanceStatusDto {
  @ApiProperty({ enum: CashAdvanceStatus, example: CashAdvanceStatus.FOR_APPROVAL })
  @IsEnum(CashAdvanceStatus)
  @IsNotEmpty()
  status: CashAdvanceStatus;
}
