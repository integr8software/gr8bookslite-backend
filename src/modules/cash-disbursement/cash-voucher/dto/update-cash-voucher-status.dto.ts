import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateCashVoucherStatusDto {
  @ApiProperty({ description: 'New voucher status', example: 'For Approval' })
  @IsString()
  @IsNotEmpty()
  status!: string;
}
