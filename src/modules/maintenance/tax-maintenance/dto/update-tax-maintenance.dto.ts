import { PartialType } from '@nestjs/swagger';
import { CreateTaxMaintenanceDto } from './create-tax-maintenance.dto';

export class UpdateTaxMaintenanceDto extends PartialType(
  CreateTaxMaintenanceDto,
) {}
