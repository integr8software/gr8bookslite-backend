import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsDateString, IsArray, IsEmail, IsEnum, IsInt, IsOptional, IsString, Matches, MaxLength, Min, ValidateNested } from 'class-validator';
import { PartyClassification, PartyStatus, PartyType } from '@prisma/client';
import { CreatePartyAddressDto } from './create-party-address.dto';

export class CreatePartyDto {
  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  branchUnitId?: number;

  @ApiProperty({ maxLength: 80 })
  @IsString()
  @MaxLength(80)
  partyCodeNo!: string;

  @ApiProperty({ enum: PartyClassification })
  @IsEnum(PartyClassification)
  classification!: PartyClassification;

  @ApiPropertyOptional({ maxLength: 120, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  partyEntityType?: string | null;

  @ApiProperty({ enum: PartyType, isArray: true, minItems: 1 })
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(PartyType, { each: true })
  partyTypes!: PartyType[];

  @ApiPropertyOptional({ enum: PartyStatus })
  @IsOptional()
  @IsEnum(PartyStatus)
  status?: PartyStatus;

  @ApiPropertyOptional({ maxLength: 255, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  partyName?: string | null;

  @ApiPropertyOptional({ maxLength: 255, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  tradeName?: string | null;

  @ApiPropertyOptional({ maxLength: 120, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  firstName?: string | null;

  @ApiPropertyOptional({ maxLength: 120, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  middleName?: string | null;

  @ApiPropertyOptional({ maxLength: 120, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  lastName?: string | null;

  @ApiPropertyOptional({ maxLength: 40, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  suffixName?: string | null;

  @ApiPropertyOptional({ maxLength: 80, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  honorific?: string | null;

  @ApiPropertyOptional({ maxLength: 40, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  gender?: string | null;

  @ApiPropertyOptional({ maxLength: 40, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  civilStatus?: string | null;

  @ApiPropertyOptional({ maxLength: 80, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  nationality?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsDateString()
  memberRegistrationDate?: string | null;

  @ApiProperty({ type: [CreatePartyAddressDto], minItems: 1 })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePartyAddressDto)
  addresses!: CreatePartyAddressDto[];

  @ApiPropertyOptional({ maxLength: 80, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  defaultReceivableAccount?: string | null;

  @ApiPropertyOptional({ maxLength: 80, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  customerAdvanceAccount?: string | null;

  @ApiPropertyOptional({ maxLength: 80, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  defaultPayableAccount?: string | null;

  @ApiPropertyOptional({ maxLength: 80, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  vendorAdvanceAccount?: string | null;

  @ApiPropertyOptional({ maxLength: 80, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  employeeAdvanceAccount?: string | null;

  @ApiPropertyOptional({ maxLength: 80, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  employeePayableAccount?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  termId?: string | null;

  @ApiPropertyOptional({ pattern: '^\\d{3}-\\d{3}-\\d{3}-\\d{3}$', nullable: true })
  @IsOptional()
  @IsString()
  @Matches(/^\d{3}-\d{3}-\d{3}-\d{3}$/, {
    message: 'TIN must use the format 000-000-000-000.',
  })
  tin?: string | null;

  @ApiPropertyOptional({ maxLength: 40, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  atcCode?: string | null;

  @ApiPropertyOptional({ maxLength: 40, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  defaultPurchaseInputVatTaxSourceKey?: string | null;

  @ApiPropertyOptional({ maxLength: 40, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  defaultPurchaseEwtTaxSourceKey?: string | null;

  @ApiPropertyOptional({ maxLength: 40, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  defaultPurchaseFwtTaxSourceKey?: string | null;

  @ApiPropertyOptional({ maxLength: 40, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  defaultPurchaseWvatTaxSourceKey?: string | null;

  @ApiPropertyOptional({ maxLength: 40, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  defaultSalesOutputVatTaxSourceKey?: string | null;

  @ApiPropertyOptional({ maxLength: 40, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  defaultSalesCwtTaxSourceKey?: string | null;

  @ApiPropertyOptional({ maxLength: 40, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  defaultSalesWvatTaxSourceKey?: string | null;

  @ApiPropertyOptional({ maxLength: 255, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  contactPerson?: string | null;

  @ApiPropertyOptional({ maxLength: 255, nullable: true })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string | null;

  @ApiPropertyOptional({ pattern: '^\\+63 \\d{3} \\d{3} \\d{4}$', nullable: true })
  @IsOptional()
  @IsString()
  @Matches(/^\+63 \d{3} \d{3} \d{4}$/, {
    message: 'Contact number must use the format +63 000 000 0000.',
  })
  contactNo?: string | null;

  @ApiPropertyOptional({ maxLength: 40, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  landline?: string | null;
}
