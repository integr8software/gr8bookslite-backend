import { IsString, Matches, MaxLength } from 'class-validator';

export class UpsertTaxAccountMappingDto {
  @IsString()
  @Matches(/^[A-Z][A-Z0-9_]*$/)
  @MaxLength(100)
  accountRole!: string;

  @IsString()
  accountId!: string;
}
