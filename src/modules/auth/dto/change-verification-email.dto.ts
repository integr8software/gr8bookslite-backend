import { IsEmail } from 'class-validator';

export class ChangeVerificationEmailDto {
  @IsEmail()
  currentEmail!: string;

  @IsEmail()
  newEmail!: string;
}
