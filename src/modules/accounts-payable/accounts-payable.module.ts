import { Module } from '@nestjs/common';
import { AccountsPayableVoucherModule } from './accounts-payable-voucher/accounts-payable-voucher.module';

@Module({
  imports: [AccountsPayableVoucherModule],
})
export class AccountsPayableModule {}
