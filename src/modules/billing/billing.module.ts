import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../common/access/access-control.module';
import { AuthModule } from '../auth/auth.module';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { PaymongoWebhookController } from './paymongo-webhook.controller';
import { BillingPaymentApplicationService } from './services/billing-payment-application.service';
import { PaymongoService } from './services/paymongo.service';
import { PaymongoWebhookService } from './services/paymongo-webhook.service';

@Module({
  imports: [AuthModule, AccessControlModule],
  controllers: [BillingController, PaymongoWebhookController],
  providers: [
    BillingService,
    BillingPaymentApplicationService,
    PaymongoService,
    PaymongoWebhookService,
  ],
  exports: [BillingService, BillingPaymentApplicationService],
})
export class BillingModule {}
