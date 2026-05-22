import { IsString, Length, Matches } from 'class-validator';

export class VerifyPasswordChangeCodeDto {
  @IsString()
  @Length(4, 4)
  @Matches(/^\d+$/)
  code!: string;
}
