import { ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class PartyOptionsQueryDto {
  @ApiPropertyOptional({
    description: 'Single party type, ALL, or a comma-separated list such as CUSTOMER,VENDOR.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  partyType?: string;

  @ApiPropertyOptional({
    description: 'Comma-separated party types. Takes precedence over partyType when provided.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  partyTypes?: string;

  @ApiPropertyOptional({
    enum: ['any', 'all'],
    description: 'any returns parties with at least one requested type; all returns parties with every requested type.',
  })
  @IsOptional()
  @IsIn(['any', 'all'])
  match?: 'any' | 'all';

  @ApiPropertyOptional({
    enum: ['basic', 'complete'],
    description: 'basic returns identifying fields only; complete includes address, terms, accounting IDs, and tax defaults.',
  })
  @IsOptional()
  @IsIn(['basic', 'complete'])
  detail?: 'basic' | 'complete';

  @ApiPropertyOptional({
    enum: ['true', 'false'],
    description: 'Legacy-friendly alias for detail=complete.',
  })
  @IsOptional()
  @IsIn(['true', 'false'])
  includeDetails?: 'true' | 'false';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}

export class PartyTypedOptionsQueryDto extends OmitType(PartyOptionsQueryDto, ['partyType'] as const) {}
