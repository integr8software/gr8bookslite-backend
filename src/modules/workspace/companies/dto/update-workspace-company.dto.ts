import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, Matches, MinLength } from 'class-validator';

const NamePattern = /^[\p{L}\p{M}]+(?:[ .'-]+[\p{L}\p{M}]+)*$/u;
const OptionalNamePattern = /^(?:$|[\p{L}\p{M}]+(?:[ .'-]+[\p{L}\p{M}]+)*)$/u;
const TinPattern = /^\d{3}-\d{3}-\d{3}$|^\d{3}-\d{3}-\d{3}-\d{3}$|^\d{9}$|^\d{12}$/;
const ContactNumberPattern = /^\+63 [\d ]{7,14}$/;
const DatePattern = /^\d{4}-\d{2}-\d{2}$/;

export class UpdateWorkspaceCompanyDto {
  @ApiPropertyOptional({ example: 'PH' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{2}$/, {
    message: 'Select a valid company country.',
  })
  countryCode?: string;

  @ApiPropertyOptional({ example: 'PHP' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/, {
    message: 'Select a valid base currency.',
  })
  baseCurrencyCode?: string;

  @IsOptional()
  @IsIn(['individual', 'non-individual'])
  taxpayerType?: 'individual' | 'non-individual';

  @IsOptional()
  @IsString()
  @MinLength(2)
  @Matches(NamePattern)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @Matches(NamePattern)
  firstName?: string;

  @IsOptional()
  @IsString()
  @Matches(OptionalNamePattern)
  middleName?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  companyName?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  nonIndividualType?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  nonIndividualTypeOther?: string;

  @IsOptional()
  @IsString()
  logoFileName?: string;

  @IsOptional()
  @IsString()
  logoMimeType?: string;

  @IsOptional()
  @IsString()
  logoStoragePath?: string;

  @IsOptional()
  @IsString()
  logoPublicUrl?: string;

  @IsOptional()
  @IsString()
  @MinLength(5)
  address?: string;

  @IsOptional()
  @IsString()
  @Matches(TinPattern)
  tin?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @Matches(ContactNumberPattern)
  contactNumber?: string;

  @IsOptional()
  @IsString()
  @Matches(DatePattern)
  reportStartDate?: string;

  @IsOptional()
  @IsString()
  @Matches(DatePattern)
  reportEndDate?: string;

  @IsOptional()
  @IsString()
  website?: string;
}
