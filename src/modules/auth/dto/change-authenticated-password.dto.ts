import { IsString, MinLength } from 'class-validator';

export class ChangeAuthenticatedPasswordDto {
  @IsString()
  resetToken!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;

  @IsString()
  @MinLength(8)
  confirmNewPassword!: string;
}
