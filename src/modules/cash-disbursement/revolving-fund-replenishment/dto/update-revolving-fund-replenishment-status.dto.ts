import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { RevolvingFundReplenishmentStatus } from '@prisma/client';

export class UpdateRevolvingFundReplenishmentStatusDto {
  @ApiProperty({ description: 'Target Revolving Fund Replenishment status', enum: RevolvingFundReplenishmentStatus, example: RevolvingFundReplenishmentStatus.APPROVED })
  @IsEnum(RevolvingFundReplenishmentStatus)
  status: RevolvingFundReplenishmentStatus;
}
