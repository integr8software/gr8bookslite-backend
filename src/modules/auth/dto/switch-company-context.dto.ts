import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class SwitchCompanyContextDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  companyId!: number;
}
