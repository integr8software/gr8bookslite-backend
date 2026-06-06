import { IsString, Length } from 'class-validator';

export class ExchangeGoogleSessionDto {
  @IsString()
  @Length(64, 64)
  handoffCode!: string;
}
