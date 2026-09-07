import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { RevolvingFundReplenishmentStatus } from '@prisma/client';

export class UpdateRevolvingFundReplenishmentStatusDto {
  @ApiProperty({ enum: RevolvingFundReplenishmentStatus, example: RevolvingFundReplenishmentStatus.APPROVED, description: 'Target Revolving Fund Replenishment status' })
  @IsEnum(RevolvingFundReplenishmentStatus)
  status: RevolvingFundReplenishmentStatus;
}
