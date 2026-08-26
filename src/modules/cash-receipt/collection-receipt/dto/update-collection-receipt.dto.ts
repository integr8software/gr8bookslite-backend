import { PartialType } from '@nestjs/swagger';
import { CreateCollectionReceiptDto } from './create-collection-receipt.dto';

export class UpdateCollectionReceiptDto extends PartialType(CreateCollectionReceiptDto) {}
