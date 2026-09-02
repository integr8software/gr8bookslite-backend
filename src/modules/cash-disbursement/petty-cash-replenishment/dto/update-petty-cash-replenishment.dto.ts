import { PartialType } from '@nestjs/swagger';
import { CreatePettyCashReplenishmentDto } from './create-petty-cash-replenishment.dto';

export class UpdatePettyCashReplenishmentDto extends PartialType(CreatePettyCashReplenishmentDto) {}
