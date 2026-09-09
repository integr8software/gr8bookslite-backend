import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { RevolvingFundStatus } from '@prisma/client';

export class UpdateRevolvingFundStatusDto {
  @ApiProperty({ description: 'Target Revolving Fund status', enum: RevolvingFundStatus, example: RevolvingFundStatus.POSTED })
  @IsEnum(RevolvingFundStatus)
  status: RevolvingFundStatus;
}
