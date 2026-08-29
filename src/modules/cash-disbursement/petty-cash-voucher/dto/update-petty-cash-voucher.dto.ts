import { PartialType } from '@nestjs/swagger';
import { CreatePettyCashVoucherDto } from './create-petty-cash-voucher.dto';

export class UpdatePettyCashVoucherDto extends PartialType(CreatePettyCashVoucherDto) {}
