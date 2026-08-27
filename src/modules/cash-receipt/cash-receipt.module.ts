import { Module } from '@nestjs/common';
import { AcknowledgementReceiptModule } from './acknowledgement-receipt/acknowledgement-receipt.module';
import { CollectionReceiptModule } from './collection-receipt/collection-receipt.module';
import { OfficialReceiptModule } from './official-receipt/official-receipt.module';
import { ProvisionalReceiptModule } from './provisional-receipt/provisional-receipt.module';

@Module({
  imports: [OfficialReceiptModule, CollectionReceiptModule, AcknowledgementReceiptModule, ProvisionalReceiptModule],
})
export class CashReceiptModule {}
