import { IsEmail, IsIn, IsOptional, IsString, Matches, MinLength, ValidateIf } from 'class-validator';

const NamePattern = /^[\p{L}\p{M}]+(?:[ .'-]+[\p{L}\p{M}]+)*$/u;
const OptionalNamePattern = /^(?:$|[\p{L}\p{M}]+(?:[ .'-]+[\p{L}\p{M}]+)*)$/u;
const TinPattern = /^\d{3}-\d{3}-\d{3}$|^\d{3}-\d{3}-\d{3}-\d{3}$|^\d{9}$|^\d{12}$/;
const ContactNumberPattern = /^\+63 \d{3} \d{3} \d{4}$/;
const DatePattern = /^\d{4}-\d{2}-\d{2}$/;

export class SaveOnboardingCompanyDetailsDto {
  @IsString()
  @Matches(/^[A-Z]{2}$/, {
    message: 'Select a valid company country.',
  })
  countryCode!: string;

  @IsString()
  @Matches(/^[A-Z]{3}$/, {
    message: 'Select a valid base currency.',
  })
  baseCurrencyCode!: string;

  @IsIn(['individual', 'non-individual'])
  taxpayerType!: 'individual' | 'non-individual';

  @ValidateIf((dto: SaveOnboardingCompanyDetailsDto) => dto.taxpayerType === 'individual')
  @IsString()
  @MinLength(2)
  @Matches(NamePattern, {
    message: 'Last name must contain letters only.',
  })
  lastName?: string;

  @ValidateIf((dto: SaveOnboardingCompanyDetailsDto) => dto.taxpayerType === 'individual')
  @IsString()
  @MinLength(2)
  @Matches(NamePattern, {
    message: 'First name must contain letters only.',
  })
  firstName?: string;

  @ValidateIf((dto: SaveOnboardingCompanyDetailsDto) => dto.taxpayerType === 'individual')
  @IsOptional()
  @IsString()
  @Matches(OptionalNamePattern, {
    message: 'Middle name must contain letters only.',
  })
  middleName?: string;

  @ValidateIf((dto: SaveOnboardingCompanyDetailsDto) => dto.taxpayerType === 'non-individual')
  @IsString()
  @MinLength(2)
  companyName?: string;

  @ValidateIf((dto: SaveOnboardingCompanyDetailsDto) => dto.taxpayerType === 'non-individual')
  @IsString()
  @MinLength(2)
  nonIndividualType?: string;

  @ValidateIf((dto: SaveOnboardingCompanyDetailsDto) => dto.taxpayerType === 'non-individual' && dto.nonIndividualType === 'Others')
  @IsString()
  @MinLength(2)
  nonIndividualTypeOther?: string;

  @IsString()
  @MinLength(1)
  logoName!: string;

  @IsOptional()
  @IsString()
  @Matches(/^image\//, {
    message: 'Logo MIME type must be an image type.',
  })
  logoMimeType?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  logoStoragePath?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  logoPublicUrl?: string;

  @IsString()
  @MinLength(5)
  address!: string;

  @IsString()
  @Matches(TinPattern, {
    message: 'Enter a valid TIN in the format XXX-XXX-XXX or XXX-XXX-XXX-XXX.',
  })
  tin!: string;

  @IsString()
  @IsEmail({}, { message: 'Enter a valid company email.' })
  companyEmail!: string;

  @IsString()
  @Matches(ContactNumberPattern, {
    message: 'Enter a valid contact number in the format.',
  })
  contactNumber!: string;

  @IsString()
  @Matches(DatePattern, {
    message: 'Select a valid report start date.',
  })
  reportStartDate!: string;

  @IsString()
  @Matches(DatePattern, {
    message: 'Select a valid report end date.',
  })
  reportEndDate!: string;

  @IsOptional()
  @IsString()
  @Matches(/^$|^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/, {
    message: 'Enter a valid website URL.',
  })
  website?: string;
}
