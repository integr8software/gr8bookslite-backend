import { ApiProperty } from '@nestjs/swagger';

export class CashAdvancePartyOptionDto {
  @ApiProperty({ example: '17' })
  partyId: string;

  @ApiProperty({ example: 'EMP-0017' })
  partyCode: string;

  @ApiProperty({ example: 'Maria Santos' })
  partyName: string;

  @ApiProperty({ example: 'EMP-0017 - Maria Santos' })
  label: string;

  @ApiProperty({ example: 'EMP-0017' })
  value: string;

  @ApiProperty({ example: '50000.00' })
  cashAdvanceLimit: string;

  @ApiProperty({ example: '12500.00' })
  totalCashAdvance: string;

  @ApiProperty({ example: '37500.00' })
  availableCashAdvance: string;
}

export class CashAdvancePartyOptionsResponseDto {
  @ApiProperty({ type: [CashAdvancePartyOptionDto] })
  options: CashAdvancePartyOptionDto[];
}
