import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsIn, IsString, Matches, ValidateNested } from 'class-validator';
import { TaxDefaultAccountDefinitions } from '../utils/tax-accounting-account.util';

const TaxDefaultAccountFields = TaxDefaultAccountDefinitions.map(({ field }) => field);

export class UpdateDefaultTaxAccountDto {
  @IsIn(TaxDefaultAccountFields)
  field!: (typeof TaxDefaultAccountFields)[number];

  @IsString()
  @Matches(/^[1-9]\d*$/, { message: 'accountId must be a positive integer string' })
  accountId!: string;
}

export class UpdateDefaultTaxAccountsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UpdateDefaultTaxAccountDto)
  accounts!: UpdateDefaultTaxAccountDto[];
}
