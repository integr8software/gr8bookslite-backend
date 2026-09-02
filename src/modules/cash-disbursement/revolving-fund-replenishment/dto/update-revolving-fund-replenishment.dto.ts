import { PartialType } from '@nestjs/swagger';
import { CreateRevolvingFundReplenishmentDto } from './create-revolving-fund-replenishment.dto';

export class UpdateRevolvingFundReplenishmentDto extends PartialType(CreateRevolvingFundReplenishmentDto) {}
