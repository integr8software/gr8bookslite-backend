import { PartialType } from '@nestjs/swagger';
import { CreateRevolvingFundDto } from './create-revolving-fund.dto';

export class UpdateRevolvingFundDto extends PartialType(CreateRevolvingFundDto) {}
