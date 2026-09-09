import { Module } from '@nestjs/common';
import { PurchaseRequestModule } from './purchase-request/purchase-request.module';
import { PurchaseOrderModule } from './purchase-order/purchase-order.module';

@Module({
  imports: [PurchaseRequestModule, PurchaseOrderModule],
})
export class PurchasingModule {}
