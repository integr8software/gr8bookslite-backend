import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { toOptionalInt } from '../../../../common/utils/dto-transform.util';

export class GetWarehouseAccessDirectoryQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  branchUnitId?: number;
}
