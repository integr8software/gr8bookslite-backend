import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  ValidateIf,
} from 'class-validator';

const NamePattern = /^[A-Za-z]+(?:[ .'-]+[A-Za-z]+)*$/;
const TinPattern =
  /^\d{3}-\d{3}-\d{3}$|^\d{3}-\d{3}-\d{3}-\d{3}$|^\d{9}$|^\d{12}$/;
const ContactNumberPattern = /^\+63 [\d ]{7,14}$/;
const DatePattern = /^\d{4}-\d{2}-\d{2}$/;

export class CreateWorkspaceCompanyDto {
  @IsIn(['individual', 'non-individual'])
  taxpayerType!: 'individual' | 'non-individual';

  @ValidateIf(
    (dto: CreateWorkspaceCompanyDto) => dto.taxpayerType === 'individual',
  )
  @IsString()
  @MinLength(2)
  @Matches(NamePattern)
  lastName?: string;

  @ValidateIf(
    (dto: CreateWorkspaceCompanyDto) => dto.taxpayerType === 'individual',
  )
  @IsString()
  @MinLength(2)
  @Matches(NamePattern)
  firstName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^$|^[A-Za-z]+(?:[ .'-]+[A-Za-z]+)*$/)
  middleName?: string;

  @ValidateIf(
    (dto: CreateWorkspaceCompanyDto) => dto.taxpayerType === 'non-individual',
  )
  @IsString()
  @MinLength(2)
  companyName?: string;

  @ValidateIf(
    (dto: CreateWorkspaceCompanyDto) => dto.taxpayerType === 'non-individual',
  )
  @IsString()
  @MinLength(2)
  nonIndividualType?: string;

  @ValidateIf(
    (dto: CreateWorkspaceCompanyDto) =>
      dto.taxpayerType === 'non-individual' &&
      dto.nonIndividualType === 'Others',
  )
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

  @IsString()
  @MinLength(5)
  address!: string;

  @IsString()
  @Matches(TinPattern)
  tin!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @Matches(ContactNumberPattern)
  contactNumber!: string;

  @IsString()
  @Matches(DatePattern)
  reportStartDate!: string;

  @IsString()
  @Matches(DatePattern)
  reportEndDate!: string;

  @IsOptional()
  @IsString()
  website?: string;
}
