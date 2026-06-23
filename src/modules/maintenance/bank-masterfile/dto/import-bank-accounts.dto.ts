import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, ValidateNested } from 'class-validator';
import { CreateBankAccountDto } from './create-bank-account.dto';

export class ImportBankAccountsDto {
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => CreateBankAccountDto)
  banks!: CreateBankAccountDto[];
}