import { PartialType } from '@nestjs/swagger';
import { CreateBillingStatementDto } from './create-billing-statement.dto';

export class UpdateBillingStatementDto extends PartialType(CreateBillingStatementDto) {}
