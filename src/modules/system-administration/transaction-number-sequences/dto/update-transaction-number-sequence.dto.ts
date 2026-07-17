import { Type } from 'class-transformer';
import { IsArray, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class UpdateTransactionNumberSequenceDto {
  @IsString()
  @MaxLength(80)
  moduleCode!: string;

  @IsString()
  @MaxLength(120)
  moduleName!: string;

  @IsIn(['Auto', 'Manual'])
  inputMode!: 'Auto' | 'Manual';

  @IsString()
  @MaxLength(40)
  prefix!: string;

  @IsString()
  @MaxLength(40)
  @IsOptional()
  suffix?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  padding!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  startingNumber!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  currentNumber!: number;

  @IsIn(['all', 'branch'])
  scope!: 'all' | 'branch';

  @Type(() => Number)
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  branchUnitIds!: number[];

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  branchUnitId?: number;

  @IsIn(['Active', 'Inactive'])
  status!: 'Active' | 'Inactive';
}
