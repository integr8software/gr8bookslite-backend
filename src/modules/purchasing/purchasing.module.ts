import { Module } from '@nestjs/common';
import { PurchaseRequestModule } from './purchase-request/purchase-request.module';

@Module({
  imports: [PurchaseRequestModule],
})
export class PurchasingModule {}
