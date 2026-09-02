import { PartialType } from '@nestjs/swagger';
import { CreatePettyCashFundDto } from './create-petty-cash-fund.dto';

export class UpdatePettyCashFundDto extends PartialType(CreatePettyCashFundDto) {}
