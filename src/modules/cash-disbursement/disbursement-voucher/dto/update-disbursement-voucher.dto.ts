import { PartialType } from '@nestjs/swagger';
import { CreateDisbursementVoucherDto } from './create-disbursement-voucher.dto';

export class UpdateDisbursementVoucherDto extends PartialType(CreateDisbursementVoucherDto) {}
