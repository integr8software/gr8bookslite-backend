import { Module } from '@nestjs/common';
import { CashAdvanceModule } from './cash-advance/cash-advance.module';
import { CashVoucherModule } from './cash-voucher/cash-voucher.module';

@Module({
  imports: [CashAdvanceModule, CashVoucherModule],
  exports: [CashAdvanceModule, CashVoucherModule],
})
export class CashDisbursementModule {}
