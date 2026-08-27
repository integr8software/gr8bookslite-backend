import { PartialType } from '@nestjs/swagger';
import { CreateProvisionalReceiptDto } from './create-provisional-receipt.dto';

export class UpdateProvisionalReceiptDto extends PartialType(CreateProvisionalReceiptDto) {}
