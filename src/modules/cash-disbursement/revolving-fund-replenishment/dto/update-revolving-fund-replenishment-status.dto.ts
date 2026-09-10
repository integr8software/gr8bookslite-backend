import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { RevolvingFundReplenishmentStatus } from '@prisma/client';

export class UpdateRevolvingFundReplenishmentStatusDto {
  // prettier-ignore
  @ApiProperty({ description: 'Target Revolving Fund Replenishment status', enum: RevolvingFundReplenishmentStatus, example: RevolvingFundReplenishmentStatus.POSTED })
  @IsEnum(RevolvingFundReplenishmentStatus)
  @IsNotEmpty()
  status: RevolvingFundReplenishmentStatus;
}
