import { Module } from '@nestjs/common';
import { OfficialReceiptModule } from './official-receipt/official-receipt.module';

@Module({
  imports: [OfficialReceiptModule],
})
export class CashReceiptModule {}
