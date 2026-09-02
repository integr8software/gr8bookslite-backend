import { PartialType } from '@nestjs/swagger';
import { CreateAdvanceToSupplierDto } from './create-advance-to-supplier.dto';

export class UpdateAdvanceToSupplierDto extends PartialType(CreateAdvanceToSupplierDto) {}
