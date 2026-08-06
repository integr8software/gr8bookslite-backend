import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccountsPayableVoucherStatusInputValues } from './get-accounts-payable-voucher-list-query.dto';

export class UpdateAccountsPayableVoucherStatusDto {
  @ApiProperty({ enum: AccountsPayableVoucherStatusInputValues })
  @IsIn(AccountsPayableVoucherStatusInputValues)
  status!: (typeof AccountsPayableVoucherStatusInputValues)[number];

  @ApiPropertyOptional({ maxLength: 500, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string | null;
}
