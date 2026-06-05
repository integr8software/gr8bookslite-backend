import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BillingService } from './billing.service';
import { AttachCompanySubscriptionPaymentMethodDto } from './dto/attach-company-subscription-payment-method.dto';
import {
  AttachPaymentMethodResponseDto,
  BillingPaymentMethodsResponseDto,
  BillingPlansResponseDto,
  BillingSubscriptionSetupResponseDto,
  CancelSubscriptionResponseDto,
  CurrentSubscriptionResponseDto,
  SubscribeCompanyResponseDto,
} from './dto/billing-response.dto';
import { CancelCompanySubscriptionDto } from './dto/cancel-company-subscription.dto';
import { SubscribeCompanyDto } from './dto/subscribe-company.dto';

@UseGuards(JwtAuthGuard)
@ApiTags('Billing')
@Controller({
  path: 'billing',
  version: '1',
})
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('plans')
  @ApiOkResponse({ type: BillingPlansResponseDto })
  listPlans(@Query('scope') scope?: string) {
    return this.billingService.listPlans(scope);
  }

  @Get('payment-methods')
  @ApiOkResponse({ type: BillingPaymentMethodsResponseDto })
  listPaymentMethods(@CurrentUser() user: AuthUser) {
    return this.billingService.listPaymentMethods(user);
  }

  @Get('subscription-setup')
  @ApiOkResponse({ type: BillingSubscriptionSetupResponseDto })
  getSubscriptionSetup(
    @CurrentUser() user: AuthUser,
    @Query('scope') scope?: string,
  ) {
    return this.billingService.getSubscriptionSetup(user, scope);
  }

  @Get('subscriptions/current')
  @ApiOkResponse({ type: CurrentSubscriptionResponseDto })
  getCurrentSubscription(@CurrentUser() user: AuthUser) {
    return this.billingService.getCurrentSubscription(user);
  }

  @Post('subscriptions')
  @ApiCreatedResponse({ type: SubscribeCompanyResponseDto })
  subscribeCompany(
    @CurrentUser() user: AuthUser,
    @Body() dto: SubscribeCompanyDto,
  ) {
    return this.billingService.subscribeCompany(user, dto);
  }

  @Post('subscriptions/:subscriptionId/attach-payment-method')
  @ApiCreatedResponse({ type: AttachPaymentMethodResponseDto })
  attachPaymentMethod(
    @CurrentUser() user: AuthUser,
    @Param('subscriptionId', ParseIntPipe) subscriptionId: number,
    @Body() dto: AttachCompanySubscriptionPaymentMethodDto,
  ) {
    return this.billingService.attachPaymentMethod(user, subscriptionId, dto);
  }

  @Post('subscriptions/:subscriptionId/cancel')
  @ApiCreatedResponse({ type: CancelSubscriptionResponseDto })
  cancelSubscription(
    @CurrentUser() user: AuthUser,
    @Param('subscriptionId', ParseIntPipe) subscriptionId: number,
    @Body() dto: CancelCompanySubscriptionDto,
  ) {
    return this.billingService.cancelSubscription(user, subscriptionId, dto);
  }
}
