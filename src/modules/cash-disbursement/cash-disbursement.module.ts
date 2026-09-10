import { Module } from '@nestjs/common';
import { AdvancesToSuppliersModule } from './advances-to-suppliers/advances-to-suppliers.module';
import { CashAdvanceModule } from './cash-advance/cash-advance.module';
import { CashVoucherModule } from './cash-voucher/cash-voucher.module';
import { DisbursementVoucherModule } from './disbursement-voucher/disbursement-voucher.module';
import { PettyCashVoucherModule } from './petty-cash-voucher/petty-cash-voucher.module';
import { PettyCashReplenishmentModule } from './petty-cash-replenishment/petty-cash-replenishment.module';
import { RevolvingFundModule } from './revolving-fund/revolving-fund.module';
import { RevolvingFundReplenishmentModule } from './revolving-fund-replenishment/revolving-fund-replenishment.module';

@Module({
  imports: [
    AdvancesToSuppliersModule,
    CashAdvanceModule,
    CashVoucherModule,
    DisbursementVoucherModule,
    PettyCashVoucherModule,
    PettyCashReplenishmentModule,
    RevolvingFundModule,
    RevolvingFundReplenishmentModule,
  ],
  exports: [
    AdvancesToSuppliersModule,
    CashAdvanceModule,
    CashVoucherModule,
    DisbursementVoucherModule,
    PettyCashVoucherModule,
    PettyCashReplenishmentModule,
    RevolvingFundModule,
    RevolvingFundReplenishmentModule,
  ],
})
export class CashDisbursementModule {}
