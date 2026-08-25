import { PartialType } from '@nestjs/swagger';
import { CreateOfficialReceiptDto } from './create-official-receipt.dto';

export class UpdateOfficialReceiptDto extends PartialType(CreateOfficialReceiptDto) {}
