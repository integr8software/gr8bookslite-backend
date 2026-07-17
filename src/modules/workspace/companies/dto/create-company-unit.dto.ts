import { IsEmail, IsIn, IsInt, IsOptional, IsString, Matches, MinLength } from 'class-validator';

const TinPattern = /^\d{3}-\d{3}-\d{3}$|^\d{3}-\d{3}-\d{3}-\d{3}$|^\d{9}$|^\d{12}$/;
const ContactNumberPattern = /^\+63 [\d ]{7,14}$/;

export class CreateCompanyUnitDto {
  @IsIn(['BRANCH', 'SATELLITE'])
  type!: 'BRANCH' | 'SATELLITE';

  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  @Matches(TinPattern)
  tin?: string;

  @IsOptional()
  @IsString()
  @MinLength(5)
  address?: string;

  @IsOptional()
  @IsString()
  @Matches(ContactNumberPattern)
  contactNumber?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsInt()
  parentUnitId?: number;
}
