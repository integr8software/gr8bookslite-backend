import { IsEmail, IsString, MinLength } from 'class-validator';

const PasswordPattern =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export class ActivateWorkspaceUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(32)
  token!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;

  @IsString()
  @MinLength(8)
  confirmNewPassword!: string;

  static isStrongPassword(value: string) {
    return PasswordPattern.test(value);
  }
}
