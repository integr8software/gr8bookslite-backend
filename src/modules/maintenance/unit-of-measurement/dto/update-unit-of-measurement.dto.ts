import { PartialType } from '@nestjs/swagger';
import { CreateUnitOfMeasurementDto } from './create-unit-of-measurement.dto';

export class UpdateUnitOfMeasurementDto extends PartialType(CreateUnitOfMeasurementDto) {}
