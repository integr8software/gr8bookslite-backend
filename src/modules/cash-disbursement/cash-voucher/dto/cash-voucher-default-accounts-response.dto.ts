import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CashVoucherDefaultAccountDto {
  @ApiProperty({ description: 'Chart Account ID', example: '10' })
  accountId: string;

  @ApiProperty({ description: 'Account Code', example: '1010101001' })
  accountCode: string;

  @ApiProperty({ description: 'Account Title', example: 'Cash On Hand' })
  accountTitle: string;
}

export class CashVoucherDefaultAccountsResponseDto {
  @ApiProperty({
    description: 'Default Cash on Hand Account for Cash Voucher',
    type: CashVoucherDefaultAccountDto,
  })
  defaultCashAccount: CashVoucherDefaultAccountDto;

  @ApiPropertyOptional({
    description: 'Default settlement credit account (synonym for defaultCashAccount in CV)',
    type: CashVoucherDefaultAccountDto,
  })
  creditAccount?: CashVoucherDefaultAccountDto;
}
