import { PartialType } from '@nestjs/swagger';
import { CreateAcknowledgementReceiptDto } from './create-acknowledgement-receipt.dto';

export class UpdateAcknowledgementReceiptDto extends PartialType(CreateAcknowledgementReceiptDto) {}
