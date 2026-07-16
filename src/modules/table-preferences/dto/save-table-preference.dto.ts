import { IsObject } from 'class-validator';

export class SaveTablePreferenceDto {
  @IsObject()
  configuration!: Record<string, unknown>;
}
