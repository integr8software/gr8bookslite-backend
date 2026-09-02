import { PartialType } from '@nestjs/swagger';
import { CreateCashAdvanceDto } from './create-cash-advance.dto';

export class UpdateCashAdvanceDto extends PartialType(CreateCashAdvanceDto) {}
