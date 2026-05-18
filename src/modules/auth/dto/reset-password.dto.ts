import { IsJWT, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsJWT()
  resetToken!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;

  @IsString()
  @MinLength(8)
  confirmNewPassword!: string;
}
