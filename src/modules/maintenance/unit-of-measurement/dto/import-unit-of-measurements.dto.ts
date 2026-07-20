import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { CreateUnitOfMeasurementDto } from './create-unit-of-measurement.dto';

export class ImportUnitOfMeasurementsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => CreateUnitOfMeasurementDto)
  units!: CreateUnitOfMeasurementDto[];
}
