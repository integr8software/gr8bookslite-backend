import { IsEnum } from 'class-validator';
import { ResponsibilityCenterStatus } from '@prisma/client';

export class UpdateResponsibilityCenterStatusDto {
  @IsEnum(ResponsibilityCenterStatus)
  status!: ResponsibilityCenterStatus;
}
