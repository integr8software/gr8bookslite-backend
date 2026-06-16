import { PartialType } from '@nestjs/swagger';
import { CreateChartAccountDto } from './create-chart-account.dto';

export class UpdateChartAccountDto extends PartialType(CreateChartAccountDto) {}
