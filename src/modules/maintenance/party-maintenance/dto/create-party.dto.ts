import { Type } from 'class-transformer';
import { ArrayMinSize, IsDateString, IsArray, IsEmail, IsEnum, IsInt, IsOptional, IsString, Matches, MaxLength, Min, ValidateNested } from 'class-validator';
import { PartyClassification, PartyStatus, PartyType, PartyVatRegistrationType } from '@prisma/client';
import { CreatePartyAddressDto } from './create-party-address.dto';

export class CreatePartyDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  branchUnitId?: number;

  @IsString()
  @MaxLength(80)
  partyCodeNo!: string;

  @IsEnum(PartyClassification)
  classification!: PartyClassification;

  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(PartyType, { each: true })
  partyTypes!: PartyType[];

  @IsOptional()
  @IsEnum(PartyStatus)
  status?: PartyStatus;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  partyName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  tradeName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  firstName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  middleName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  lastName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  suffixName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  honorific?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  gender?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  civilStatus?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  nationality?: string | null;

  @IsOptional()
  @IsDateString()
  memberRegistrationDate?: string | null;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePartyAddressDto)
  addresses!: CreatePartyAddressDto[];

  @IsOptional()
  @IsString()
  @MaxLength(80)
  defaultReceivableAccount?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  customerAdvanceAccount?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  defaultPayableAccount?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  vendorAdvanceAccount?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  employeeAdvanceAccount?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  employeePayableAccount?: string | null;

  @IsOptional()
  @IsString()
  termId?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/^\d{3}-\d{3}-\d{3}-\d{3}$/, {
    message: 'TIN must use the format 000-000-000-000.',
  })
  tin?: string | null;

  @IsOptional()
  @IsEnum(PartyVatRegistrationType)
  vatRegistrationType?: PartyVatRegistrationType | null;

  @IsOptional()
  @IsString()
  vatRegistrationTypeId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  atcCode?: string | null;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/^\+63 \d{3} \d{3} \d{4}$/, {
    message: 'Contact number must use the format +63 000 000 0000.',
  })
  contactNo?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  landline?: string | null;
}
