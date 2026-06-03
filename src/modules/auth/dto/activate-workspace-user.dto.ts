import { IsEmail, IsString, Matches, MinLength } from 'class-validator';

const PasswordPattern =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const PasswordMessage =
  'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.';

export class ActivateWorkspaceUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(32)
  token!: string;

  @IsString()
  @MinLength(8)
  @Matches(PasswordPattern, { message: PasswordMessage })
  newPassword!: string;

  @IsString()
  @MinLength(8)
  @Matches(PasswordPattern, { message: PasswordMessage })
  confirmNewPassword!: string;

  static isStrongPassword(value: string) {
    return PasswordPattern.test(value);
  }
}
