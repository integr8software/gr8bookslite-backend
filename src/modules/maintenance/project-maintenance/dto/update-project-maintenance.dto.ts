import { PartialType } from '@nestjs/swagger';
import { CreateProjectMaintenanceDto } from './create-project-maintenance.dto';

export class UpdateProjectMaintenanceDto extends PartialType(CreateProjectMaintenanceDto) {}
