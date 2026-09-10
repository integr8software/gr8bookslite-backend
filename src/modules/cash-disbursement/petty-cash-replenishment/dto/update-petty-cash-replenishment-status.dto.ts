import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { PettyCashReplenishmentStatus } from '@prisma/client';

export class UpdatePettyCashReplenishmentStatusDto {
  @ApiProperty({ description: 'Target Petty Cash Replenishment status', enum: PettyCashReplenishmentStatus, example: PettyCashReplenishmentStatus.POSTED })
  @IsEnum(PettyCashReplenishmentStatus)
  status: PettyCashReplenishmentStatus;
}
