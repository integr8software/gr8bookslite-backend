import { IsNotEmpty, IsString } from 'class-validator';

export class AttachCompanySubscriptionPaymentMethodDto {
  @IsString()
  @IsNotEmpty()
  paymentMethodId!: string;
}
