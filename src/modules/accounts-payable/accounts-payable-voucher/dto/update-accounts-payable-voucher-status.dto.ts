import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { AccountsPayableVoucherStatusInputValues } from './get-accounts-payable-voucher-list-query.dto';

export class UpdateAccountsPayableVoucherStatusDto {
  @IsIn(AccountsPayableVoucherStatusInputValues)
  status!: (typeof AccountsPayableVoucherStatusInputValues)[number];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string | null;
}
