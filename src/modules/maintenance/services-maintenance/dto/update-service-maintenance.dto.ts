import { PartialType } from '@nestjs/swagger';
import { CreateServiceMaintenanceDto } from './create-service-maintenance.dto';

export class UpdateServiceMaintenanceDto extends PartialType(CreateServiceMaintenanceDto) {}
