import { Module } from '@nestjs/common';
import { JournalVoucherModule } from './journal-voucher/journal-voucher.module';

@Module({
  imports: [JournalVoucherModule],
})
export class GeneralJournalModule {}
