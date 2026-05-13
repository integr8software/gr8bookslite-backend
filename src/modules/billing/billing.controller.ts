import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BillingService } from './billing.service';
import { AttachCompanySubscriptionPaymentMethodDto } from './dto/attach-company-subscription-payment-method.dto';
import { CancelCompanySubscriptionDto } from './dto/cancel-company-subscription.dto';
import { SubscribeCompanyDto } from './dto/subscribe-company.dto';

@UseGuards(JwtAuthGuard)
@Controller({
  path: 'billing',
  version: '1',
})
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('plans')
  listPlans() {
    return this.billingService.listPlans();
  }

  @Get('subscriptions/current')
  getCurrentSubscription(@CurrentUser() user: AuthUser) {
    return this.billingService.getCurrentSubscription(user);
  }

  @Post('subscriptions')
  subscribeCompany(
    @CurrentUser() user: AuthUser,
    @Body() dto: SubscribeCompanyDto,
  ) {
    return this.billingService.subscribeCompany(user, dto);
  }

  @Post('subscriptions/:subscriptionId/attach-payment-method')
  attachPaymentMethod(
    @CurrentUser() user: AuthUser,
    @Param('subscriptionId', ParseIntPipe) subscriptionId: number,
    @Body() dto: AttachCompanySubscriptionPaymentMethodDto,
  ) {
    return this.billingService.attachPaymentMethod(user, subscriptionId, dto);
  }

  @Post('subscriptions/:subscriptionId/cancel')
  cancelSubscription(
    @CurrentUser() user: AuthUser,
    @Param('subscriptionId', ParseIntPipe) subscriptionId: number,
    @Body() dto: CancelCompanySubscriptionDto,
  ) {
    return this.billingService.cancelSubscription(user, subscriptionId, dto);
  }
}
