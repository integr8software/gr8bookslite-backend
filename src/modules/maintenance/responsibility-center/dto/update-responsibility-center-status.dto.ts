import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { ResponsibilityCenterStatus } from '@prisma/client';

export class UpdateResponsibilityCenterStatusDto {
  @ApiProperty({ enum: ResponsibilityCenterStatus })
  @IsEnum(ResponsibilityCenterStatus)
  status!: ResponsibilityCenterStatus;
}
