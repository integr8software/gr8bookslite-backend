import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

const NamePattern = /^[A-Za-z]+(?:[ .'-]+[A-Za-z]+)*$/;
const TinPattern =
  /^\d{3}-\d{3}-\d{3}$|^\d{3}-\d{3}-\d{3}-\d{3}$|^\d{9}$|^\d{12}$/;
const ContactNumberPattern = /^\+63 [\d ]{7,14}$/;
const DatePattern = /^\d{4}-\d{2}-\d{2}$/;

export class UpdateWorkspaceCompanyDto {
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
  @Matches(/^$|^[A-Za-z]+(?:[ .'-]+[A-Za-z]+)*$/)
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
