import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, ValidateNested } from 'class-validator';
import { CreateBankAccountDto } from './create-bank-account.dto';

export class ImportBankAccountsDto {
  @ApiProperty({ type: [CreateBankAccountDto], minItems: 1, maxItems: 500 })
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => CreateBankAccountDto)
  banks!: CreateBankAccountDto[];
}
