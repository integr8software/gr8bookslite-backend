import { IsIn, IsOptional } from 'class-validator';

export const TaxDefaultAccountOptionClassifications = [
  'output-sales',
  'input-importation',
  'input-purchases',
  'input-all',
  'purchase-ewt',
  'purchase-fwt',
  'purchase-wvat',
  'sales-cwt',
  'sales-wvat',
] as const;

export type TaxDefaultAccountOptionClassification = (typeof TaxDefaultAccountOptionClassifications)[number];

export class TaxDefaultAccountOptionsQueryDto {
  @IsOptional()
  @IsIn(TaxDefaultAccountOptionClassifications)
  classification?: TaxDefaultAccountOptionClassification;
}
