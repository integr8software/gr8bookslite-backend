import { IsEmail, IsString, Matches } from 'class-validator';

export class RegisterDto {
  @IsString()
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @Matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/, {
    message:
      'Password must be at least 8 characters and include at least 1 uppercase letter, 1 number, and 1 special character.',
  })
  password!: string;

  @IsString()
  @Matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/, {
    message:
      'Confirm password must be at least 8 characters and include at least 1 uppercase letter, 1 number, and 1 special character.',
  })
  confirmPassword!: string;
}
