import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateApproverSetupDto {
  @ApiProperty({ example: 'Any one approver' })
  @IsString()
  approverCondition!: string;

  @ApiProperty({ example: 'Finance Review' })
  @IsString()
  @IsNotEmpty()
  levelName!: string;

  @ApiProperty({ example: 'Level-based' })
  @IsString()
  type!: string;

  @ApiProperty({ example: 'Active' })
  @IsString()
  status!: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  level?: number;

  @ApiProperty({ example: 'cash-disbursement.disbursement-voucher' })
  @IsString()
  moduleScope!: string;

  @ApiPropertyOptional({ example: '2026-08-30', description: 'Required when type is Temporary.' })
  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @ApiProperty({
    type: [Number],
    example: [1, 2],
    description: 'Existing User ids. The User model currently uses integer ids.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @Type(() => Number)
  @IsInt({ each: true })
  approverUserIds!: number[];
}
