import {
  IsEnum,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
  ValidateNested,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BillingCycle } from '@prisma/client';

const NamePattern = /^[A-Za-z]+(?:[ .'-]+[A-Za-z]+)*$/;
const TinPattern =
  /^\d{3}-\d{3}-\d{3}$|^\d{3}-\d{3}-\d{3}-\d{3}$|^\d{9}$|^\d{12}$/;
const ContactNumberPattern = /^\+63 [\d ]{7,14}$/;
const DatePattern = /^\d{4}-\d{2}-\d{2}$/;
const PaymentMethodPattern = /^pm_[A-Za-z0-9]+$/;

export class CreateWorkspaceCompanyBillingDto {
  @IsOptional()
  @IsString()
  planCode?: string;

  @IsOptional()
  @IsEnum(BillingCycle)
  billingCycle?: BillingCycle;

  @IsOptional()
  @IsEmail()
  billingEmail?: string;

  @IsOptional()
  @IsString()
  @Matches(PaymentMethodPattern, {
    message: 'Enter a valid PayMongo payment method reference.',
  })
  paymentMethodId?: string;

  @IsOptional()
  @IsString()
  cardBrand?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}$/)
  cardLast4?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  cardExpiryMonth?: number;

  @IsOptional()
  @IsInt()
  @Min(2000)
  @Max(9999)
  cardExpiryYear?: number;
}

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

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateWorkspaceCompanyBillingDto)
  billing?: CreateWorkspaceCompanyBillingDto;
}
