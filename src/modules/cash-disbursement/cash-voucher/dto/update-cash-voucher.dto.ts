import { PartialType } from '@nestjs/swagger';
import { CreateCashVoucherDto } from './create-cash-voucher.dto';

export class UpdateCashVoucherDto extends PartialType(CreateCashVoucherDto) {}
