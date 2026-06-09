import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class RecordWorkspaceActivityDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  path!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  module!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  branchName?: string;
}
