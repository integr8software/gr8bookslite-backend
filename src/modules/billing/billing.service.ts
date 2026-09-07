import { BadRequestException, ForbiddenException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import {
  BillingMode,
  BillingPaymentPurpose,
  BillingApplicationStatus,
  BillingPaymentAttemptStatus,
  BillingCycle,
  BillingProvider,
  CompanyStatus,
  MembershipRole,
  Prisma,
  SubscriptionInvoiceStatus,
  SubscriptionPlanScope,
  SubscriptionStatus,
} from '@prisma/client';
import type { Cache } from 'cache-manager';
import { AppRole } from '../../common/enums/app-role.enum';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { normalizeEmail } from '../../common/utils/email.util';
import { PrismaService } from '../../prisma/prisma.service';
import { mapBillingPlan } from './mappers/BillingPlan.mapper';
import { mapCompanySubscription } from './mappers/CompanySubscription.mapper';
import { AttachCompanySubscriptionPaymentMethodDto } from './dto/attach-company-subscription-payment-method.dto';
import { CancelCompanySubscriptionDto } from './dto/cancel-company-subscription.dto';
import { CreateManualCheckoutSessionDto } from './dto/create-manual-checkout-session.dto';
import { SubscribeCompanyDto } from './dto/subscribe-company.dto';
import { PaymongoRequestException, PaymongoService } from './services/paymongo.service';
import { BillingPaymentApplicationService } from './services/billing-payment-application.service';
import { companySubscriptionDetailsInclude } from './utils/BillingPrisma.util';
import {
  readFirstProviderArrayObject,
  readProviderNumber,
  readProviderObject,
  readProviderResponseAttributes,
  readProviderResponseData,
  readProviderString,
  readProviderUnixDate,
} from './utils/ProviderPayload.util';
import { mapProviderSubscriptionStatus } from './utils/SubscriptionStatus.util';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymongoService: PaymongoService,
    private readonly paymentApplicationService: BillingPaymentApplicationService,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async listPlans(scope?: string) {
    const normalizedScope = this.normalizePlanScope(scope);
    const cacheKey = `billing:plans:${normalizedScope ?? 'all'}`;

    return this.cacheManager.wrap(
      cacheKey,
      async () => {
        const plans = await this.prisma.subscriptionPlan.findMany({
          where: {
            isActive: true,
            ...(normalizedScope ? (normalizedScope === SubscriptionPlanScope.ALL ? {} : { scope: { in: [normalizedScope, SubscriptionPlanScope.ALL] } }) : {}),
          },
          include: {
            prices: {
              where: { isActive: true },
              orderBy: [{ billingCycle: 'asc' }],
            },
            usageRules: {
              where: { isActive: true },
              orderBy: [{ metric: 'asc' }],
            },
            discountTiers: {
              where: { isActive: true },
              orderBy: [{ metric: 'asc' }, { thresholdCount: 'asc' }],
            },
            systems: {
              include: {
                system: {
                  include: {
                    modules: {
                      include: { module: true },
                      where: { isActive: true, module: { isActive: true } },
                    },
                  },
                },
              },
            },
          },
          orderBy: [{ scope: 'asc' }, { id: 'asc' }],
        });

        return {
          plans: plans.map(mapBillingPlan),
        };
      },
      10 * 60 * 1000,
    );
  }
  async getSubscriptionSetup(user: AuthUser, scope?: string) {
    const [plansResponse, subscriptionResponse] = await Promise.all([this.listPlans(scope), this.getCurrentSubscription(user)]);

    return {
      ...plansResponse,
      ...subscriptionResponse,
    };
  }

  private normalizePlanScope(scope?: string) {
    if (!scope?.trim()) {
      return undefined;
    }

    const normalizedScope = scope.trim().toUpperCase() as SubscriptionPlanScope;

    if (!Object.values(SubscriptionPlanScope).includes(normalizedScope)) {
      throw new BadRequestException('Selected plan scope is invalid.');
    }

    return normalizedScope;
  }

  async getCurrentSubscription(user: AuthUser) {
    const companyId = this.getCompanyId(user);

    const subscription = await this.prisma.companySubscription.findFirst({
      where: {
        companyId,
      },
      include: companySubscriptionDetailsInclude,
      orderBy: [{ startsAt: 'desc' }, { createdAt: 'desc' }],
    });

    return {
      subscription: subscription ? mapCompanySubscription(subscription) : null,
    };
  }

  async listPaymentMethods(user: AuthUser) {
    const paymentMethods = await this.prisma.billingPaymentMethod.findMany({
      where: {
        ownerUserId: user.id,
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        companySubscription: {
          select: {
            id: true,
            status: true,
            plan: {
              select: {
                code: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return {
      paymentMethods: paymentMethods.map((paymentMethod) => ({
        id: paymentMethod.id,
        ownerUserId: paymentMethod.ownerUserId,
        type: paymentMethod.type,
        brand: paymentMethod.brand,
        last4: paymentMethod.last4,
        expMonth: paymentMethod.expMonth,
        expYear: paymentMethod.expYear,
        isDefault: paymentMethod.isDefault,
        externalPaymentMethodId: paymentMethod.externalPaymentMethodId,
        company: {
          id: paymentMethod.company.id,
          name: paymentMethod.company.name,
        },
        subscription: paymentMethod.companySubscription
          ? {
              id: paymentMethod.companySubscription.id,
              status: paymentMethod.companySubscription.status,
              plan: {
                code: paymentMethod.companySubscription.plan.code,
                name: paymentMethod.companySubscription.plan.name,
              },
            }
          : null,
      })),
    };
  }

  async subscribeCompany(user: AuthUser, dto: SubscribeCompanyDto) {
    const companyId = this.getCompanyId(user);
    this.assertCompanyAdmin(user);

    return this.prepareCompanySubscription({
      companyId,
      ownerUserId: user.id,
      planCode: dto.planCode,
      billingCycle: dto.billingCycle,
    });
  }

  async createManualCheckoutSession(user: AuthUser, dto: CreateManualCheckoutSessionDto) {
    const context = await this.resolveManualCheckoutContext(user, dto);
    const { company, plan, planPrice } = context;
    const shouldDeferAdditionalCompanySubscription = dto.purpose === BillingPaymentPurpose.ADDITIONAL_COMPANY && !dto.companyId;
    const subscription = shouldDeferAdditionalCompanySubscription
      ? null
      : await this.ensureManualCompanySubscription({
          companyId: company.id,
          ownerUserId: user.id,
          planId: plan.id,
          planPriceId: planPrice.id,
          billingCycle: dto.billingCycle,
        });
    const periodStart = new Date();
    const periodEnd = this.addBillingInterval(periodStart, {
      intervalCount: planPrice.intervalCount,
      intervalUnit: planPrice.intervalUnit,
    });
    const invoice = await this.ensureManualSubscriptionInvoice({
      companyId: company.id,
      ownerUserId: user.id,
      companySubscriptionId: subscription?.id ?? null,
      subscriptionPlanId: plan.id,
      subscriptionPlanPriceId: planPrice.id,
      purpose: dto.purpose,
      billingCycle: dto.billingCycle,
      planCode: plan.code,
      planName: plan.name,
      description: `${plan.name} ${this.getBillingCycleLabel(dto.billingCycle)} manual payment`,
      amountInCents: planPrice.priceInCents,
      currency: plan.currency,
      periodStart,
      periodEnd,
    });
    const reusableAttempt = await this.findReusableManualCheckoutAttempt(invoice.id);

    if (reusableAttempt?.externalCheckoutSessionId) {
      const canReuseAttempt = await this.ensureReusableCheckoutAttemptStillExists(reusableAttempt);
      const checkoutUrl = canReuseAttempt ? this.getCheckoutUrlFromProviderPayload(reusableAttempt.rawProviderPayload) : null;

      if (checkoutUrl) {
        return {
          paymentAttemptId: reusableAttempt.id,
          paymentRequestId: reusableAttempt.id,
          checkoutSessionId: reusableAttempt.externalCheckoutSessionId,
          checkoutUrl,
          status: reusableAttempt.status,
        };
      }
    }

    const paymentAttempt = await this.createManualPaymentAttempt({
      invoiceId: invoice.id,
      companyId: company.id,
      ownerUserId: user.id,
      companySubscriptionId: subscription?.id ?? null,
      subscriptionPlanId: plan.id,
      subscriptionPlanPriceId: planPrice.id,
      purpose: dto.purpose,
      amountInCents: invoice.totalAmountInCents ?? planPrice.priceInCents,
      currency: invoice.currency,
      successUrl: dto.successUrl,
      cancelUrl: dto.cancelUrl,
      billingCycle: dto.billingCycle,
      planCode: plan.code,
    });
    const successUrl = this.withQueryParams(dto.successUrl, {
      paymentAttemptId: String(paymentAttempt.id),
      paymentRequestId: String(paymentAttempt.id),
      status: 'success',
    });
    const cancelUrl = this.withQueryParams(dto.cancelUrl, {
      paymentAttemptId: String(paymentAttempt.id),
      paymentRequestId: String(paymentAttempt.id),
      status: 'cancelled',
    });
    const metadata = {
      billing_mode: BillingMode.MANUAL,
      payment_purpose: dto.purpose,
      environment: this.configService.get<string>('APP_ENV') ?? 'unknown',
      company_id: company.id,
      owner_user_id: user.id,
      subscription_plan_id: plan.id,
      subscription_plan_code: plan.code,
      subscription_plan_price_id: planPrice.id,
      billing_cycle: dto.billingCycle,
      company_subscription_id: subscription?.id ?? null,
      local_payment_attempt_id: paymentAttempt.id,
      local_payment_request_id: paymentAttempt.id,
      local_invoice_id: invoice.id,
    };

    let checkoutSession: unknown;

    try {
      checkoutSession = await this.paymongoService.createCheckoutSession({
        amountInCents: paymentAttempt.amountInCents,
        currency: paymentAttempt.currency,
        description: invoice.description ?? `${plan.name} manual payment`,
        lineItemName: `${plan.name} (${this.getBillingCycleLabel(dto.billingCycle)})`,
        metadata,
        referenceNumber: `GBN-${paymentAttempt.id}`,
        successUrl,
        cancelUrl,
      });
    } catch (error) {
      await this.prisma.billingPaymentAttempt.update({
        where: { id: paymentAttempt.id },
        data: {
          status: BillingPaymentAttemptStatus.FAILED,
          failedAt: new Date(),
          applicationError: error instanceof Error ? `Checkout creation failed: ${error.message}` : 'Checkout creation failed.',
        },
      });
      throw error;
    }

    const checkoutData = readProviderResponseData(checkoutSession as Record<string, unknown>);
    const checkoutAttributes = readProviderResponseAttributes(checkoutData);
    const checkoutSessionId = readProviderString(checkoutData.id);
    const checkoutUrl = readProviderString(checkoutAttributes.checkout_url) ?? readProviderString(checkoutAttributes.url);

    if (!checkoutSessionId || !checkoutUrl) {
      throw new BadRequestException('PayMongo checkout session response did not include a checkout URL.');
    }

    await this.prisma.billingPaymentAttempt.update({
      where: {
        id: paymentAttempt.id,
      },
      data: {
        externalCheckoutSessionId: checkoutSessionId,
        status: BillingPaymentAttemptStatus.AWAITING_PAYMENT,
        successUrl,
        cancelUrl,
        metadata,
        rawProviderPayload: checkoutSession as Prisma.InputJsonValue,
      },
    });

    return {
      paymentAttemptId: paymentAttempt.id,
      paymentRequestId: paymentAttempt.id,
      checkoutSessionId,
      checkoutUrl,
      status: BillingPaymentAttemptStatus.AWAITING_PAYMENT,
    };
  }

  async getManualPaymentAttempt(user: AuthUser, paymentAttemptId: number) {
    const paymentAttempt = await this.prisma.billingPaymentAttempt.findUnique({
      where: {
        id: paymentAttemptId,
      },
      include: {
        subscriptionInvoice: true,
        companySubscription: {
          include: companySubscriptionDetailsInclude,
        },
      },
    });

    if (!paymentAttempt) {
      throw new NotFoundException('Payment attempt not found.');
    }

    if (paymentAttempt.ownerUserId !== user.id && user.role !== AppRole.SUPER_ADMIN) {
      if (!paymentAttempt.companyId) {
        throw new ForbiddenException('You cannot view this payment attempt.');
      }

      const membership = await this.prisma.membership.findUnique({
        where: {
          userId_companyId: {
            userId: user.id,
            companyId: paymentAttempt.companyId,
          },
        },
        select: {
          role: true,
        },
      });

      if (membership?.role !== MembershipRole.ADMIN) {
        throw new ForbiddenException('This payment attempt is not available to this account.');
      }
    }

    return {
      id: paymentAttempt.id,
      paymentAttemptId: paymentAttempt.id,
      paymentRequestId: paymentAttempt.id,
      purpose: paymentAttempt.purpose,
      status: paymentAttempt.status,
      applicationStatus: paymentAttempt.applicationStatus,
      invoice: this.mapSubscriptionInvoice(paymentAttempt.subscriptionInvoice),
      amountInCents: paymentAttempt.amountInCents,
      currency: paymentAttempt.currency,
      checkoutSessionId: paymentAttempt.externalCheckoutSessionId,
      paidAt: paymentAttempt.confirmedAt,
      confirmedAt: paymentAttempt.confirmedAt,
      failedAt: paymentAttempt.failedAt,
      expiredAt: paymentAttempt.expiredAt,
      canceledAt: paymentAttempt.canceledAt,
      appliedAt: paymentAttempt.appliedAt,
      applicationAttempts: paymentAttempt.applicationAttempts,
      lastApplicationAttemptAt: paymentAttempt.lastApplicationAttemptAt,
      applicationError: paymentAttempt.applicationError,
      subscription: paymentAttempt.companySubscription ? mapCompanySubscription(paymentAttempt.companySubscription) : null,
    };
  }

  /** @deprecated Use getManualPaymentAttempt. */
  async getManualPaymentRequest(user: AuthUser, paymentAttemptId: number) {
    return this.getManualPaymentAttempt(user, paymentAttemptId);
  }

  async retryPaymentAttemptApplication(user: AuthUser, paymentAttemptId: number) {
    if (user.role !== AppRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only super administrators can retry billing payment application.');
    }

    const result = await this.paymentApplicationService.applyPaidAttempt(paymentAttemptId);
    const paymentAttempt = await this.getManualPaymentAttempt(user, paymentAttemptId);

    return {
      ...paymentAttempt,
      retry: result,
    };
  }

  async prepareCompanySubscription(input: {
    companyId: number;
    ownerUserId: number;
    planCode: string;
    billingCycle: BillingCycle;
    billingEmail?: string | null;
  }) {
    const companyId = input.companyId;

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException('Company not found.');
    }

    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: {
        code: input.planCode.trim().toUpperCase(),
      },
      include: {
        prices: {
          where: { isActive: true },
          orderBy: [{ billingCycle: 'asc' }],
        },
      },
    });

    if (!plan || !plan.isActive) {
      throw new BadRequestException('Selected subscription plan is invalid.');
    }

    const planPrice = plan.prices.find((price) => price.billingCycle === input.billingCycle);

    if (!planPrice) {
      throw new BadRequestException('Selected billing interval is not available for this plan.');
    }

    const latestSubscription = await this.prisma.companySubscription.findFirst({
      where: {
        companyId,
      },
      orderBy: [{ startsAt: 'desc' }, { createdAt: 'desc' }],
    });

    const blockingStatuses = new Set<SubscriptionStatus>([
      SubscriptionStatus.INCOMPLETE,
      SubscriptionStatus.TRIALING,
      SubscriptionStatus.ACTIVE,
      SubscriptionStatus.PAST_DUE,
      SubscriptionStatus.UNPAID,
    ]);

    if (latestSubscription && blockingStatuses.has(latestSubscription.status)) {
      if (
        latestSubscription.status === SubscriptionStatus.INCOMPLETE &&
        latestSubscription.subscriptionPlanId === plan.id &&
        latestSubscription.billingCycle === input.billingCycle
      ) {
        const existingSubscription = await this.prisma.companySubscription.findUniqueOrThrow({
          where: {
            id: latestSubscription.id,
          },
          include: companySubscriptionDetailsInclude,
        });

        return {
          message: 'Subscription already exists. Attach a payment method and wait for webhook confirmation before granting paid access.',
          subscription: mapCompanySubscription(existingSubscription),
          paymentSetup: {
            latestInvoiceId: existingSubscription.latestInvoiceExternalId,
            latestPaymentIntentId: existingSubscription.latestPaymentIntentId,
          },
        };
      }

      throw new BadRequestException('This company already has an in-flight or active subscription. Cancel or settle it first.');
    }

    const fallbackEmail = await this.getCompanyAdminEmail(input.ownerUserId);
    const customerInput = {
      companyId,
      ownerUserId: input.ownerUserId,
      companyName: company.legalName?.trim() || company.name,
      ownerFirstName: company.ownerFirstName,
      ownerLastName: company.ownerLastName,
      contactNumber: company.contactNumber,
      preferredEmail: input.billingEmail ?? null,
      fallbackEmail,
    };

    const billingCustomer = await this.ensureBillingCustomer(customerInput);

    const externalPlanId = await this.ensureExternalPlanId(plan, planPrice, input.billingCycle);

    const remoteSubscription = await this.paymongoService.createSubscription({
      customerId: billingCustomer.externalCustomerId,
      planId: externalPlanId,
      metadata: {
        company_id: companyId,
        local_plan_code: plan.code,
        local_plan_price_id: planPrice.id,
        local_billing_cycle: input.billingCycle,
      },
    });

    const remoteSubscriptionData = readProviderResponseData(remoteSubscription);
    const remoteSubscriptionAttributes = readProviderResponseAttributes(remoteSubscriptionData);
    const latestInvoice = readProviderObject(remoteSubscriptionAttributes.latest_invoice);
    const latestInvoiceAttributes = readProviderObject(latestInvoice?.attributes);
    const latestPaymentIntent = readProviderObject(latestInvoice?.payment_intent);

    const createdSubscription = await this.prisma.$transaction(async (tx) => {
      const subscription = await tx.companySubscription.create({
        data: {
          companyId,
          subscriptionPlanId: plan.id,
          subscriptionPlanPriceId: planPrice.id,
          billingCustomerId: billingCustomer.id,
          billingCycle: input.billingCycle,
          billingMode: BillingMode.AUTO,
          autoRenew: true,
          billingProvider: BillingProvider.PAYMONGO,
          status: mapProviderSubscriptionStatus(readProviderString(remoteSubscriptionAttributes.status) ?? 'incomplete'),
          externalCustomerId: billingCustomer.externalCustomerId,
          externalSubscriptionId: readProviderString(remoteSubscriptionData.id),
          externalPlanId,
          latestInvoiceExternalId: readProviderString(latestInvoice?.id),
          latestPaymentIntentId: readProviderString(latestPaymentIntent?.id),
          startsAt: readProviderUnixDate(remoteSubscriptionAttributes.created_at) ?? new Date(),
          currentPeriodStartAt: readProviderUnixDate(remoteSubscriptionAttributes.created_at) ?? null,
          nextBillingAt: readProviderUnixDate(remoteSubscriptionAttributes.next_billing_schedule),
          rawProviderPayload: remoteSubscription as Prisma.InputJsonValue,
        },
      });

      const latestInvoiceId = readProviderString(latestInvoice?.id);

      if (latestInvoiceId) {
        await tx.subscriptionInvoice.upsert({
          where: {
            externalInvoiceId: latestInvoiceId,
          },
          update: {
            externalPaymentIntentId: readProviderString(latestPaymentIntent?.id),
            status: this.normalizeSubscriptionInvoiceStatus(readProviderString(latestInvoiceAttributes?.status)),
            billingReason: readProviderString(latestInvoiceAttributes?.billing_reason) ?? 'subscription_create',
            currency: plan.currency,
            amountDueInCents: readProviderNumber(latestInvoiceAttributes?.amount_due),
            amountPaidInCents: readProviderNumber(latestInvoiceAttributes?.amount_paid),
            dueAt: readProviderUnixDate(latestInvoiceAttributes?.due_at),
            paidAt: readProviderUnixDate(latestInvoiceAttributes?.paid_at),
            finalizedAt: readProviderUnixDate(latestInvoiceAttributes?.finalized_at),
            rawProviderPayload: remoteSubscription as Prisma.InputJsonValue,
          },
          create: {
            companySubscriptionId: subscription.id,
            billingProvider: BillingProvider.PAYMONGO,
            externalInvoiceId: latestInvoiceId,
            externalPaymentIntentId: readProviderString(latestPaymentIntent?.id),
            status: this.normalizeSubscriptionInvoiceStatus(readProviderString(latestInvoiceAttributes?.status)),
            billingReason: readProviderString(latestInvoiceAttributes?.billing_reason) ?? 'subscription_create',
            currency: plan.currency,
            amountDueInCents: readProviderNumber(latestInvoiceAttributes?.amount_due),
            amountPaidInCents: readProviderNumber(latestInvoiceAttributes?.amount_paid),
            dueAt: readProviderUnixDate(latestInvoiceAttributes?.due_at),
            paidAt: readProviderUnixDate(latestInvoiceAttributes?.paid_at),
            finalizedAt: readProviderUnixDate(latestInvoiceAttributes?.finalized_at),
            rawProviderPayload: remoteSubscription as Prisma.InputJsonValue,
          },
        });
      }

      return tx.companySubscription.findUniqueOrThrow({
        where: { id: subscription.id },
        include: companySubscriptionDetailsInclude,
      });
    });

    this.logger.log(`Created PayMongo subscription ${createdSubscription.externalSubscriptionId ?? 'unknown'} for company ${companyId}.`);

    return {
      message: 'Subscription created. Attach a payment method and wait for webhook confirmation before granting paid access.',
      subscription: mapCompanySubscription(createdSubscription),
      paymentSetup: {
        latestInvoiceId: createdSubscription.latestInvoiceExternalId,
        latestPaymentIntentId: createdSubscription.latestPaymentIntentId,
      },
    };
  }

  private async resolveManualCheckoutContext(user: AuthUser, dto: CreateManualCheckoutSessionDto) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: {
        code: dto.planCode.trim().toUpperCase(),
      },
      include: {
        prices: {
          where: { isActive: true },
          orderBy: [{ billingCycle: 'asc' }],
        },
      },
    });

    if (!plan || !plan.isActive || plan.status !== 'ACTIVE') {
      throw new BadRequestException('Selected subscription plan is invalid.');
    }

    this.assertManualPurposeMatchesPlanScope(dto.purpose, plan.scope);
    const planPrice = plan.prices.find((price) => price.billingCycle === dto.billingCycle);

    if (!planPrice) {
      throw new BadRequestException('Selected billing interval is not available for this plan.');
    }

    const companyId =
      dto.purpose === BillingPaymentPurpose.ONBOARDING
        ? await this.resolveOnboardingManualCompanyId(user.id, plan.id, dto)
        : (dto.companyId ?? this.getCompanyId(user));
    const company = await this.prisma.company.findUnique({
      where: {
        id: companyId,
      },
    });

    if (!company) {
      throw new NotFoundException('Company not found.');
    }

    if (dto.purpose !== BillingPaymentPurpose.ONBOARDING) {
      await this.assertCanManageCompanyBilling(user, company.id);
    }

    return {
      company,
      plan,
      planPrice,
    };
  }

  private assertManualPurposeMatchesPlanScope(purpose: BillingPaymentPurpose, scope: SubscriptionPlanScope) {
    if (scope === SubscriptionPlanScope.ALL) {
      return;
    }

    if (purpose === BillingPaymentPurpose.ONBOARDING && scope !== SubscriptionPlanScope.ONBOARDING) {
      throw new BadRequestException('Selected plan is not available for onboarding.');
    }

    if (purpose === BillingPaymentPurpose.ADDITIONAL_COMPANY && scope !== SubscriptionPlanScope.ADDITIONAL_COMPANY) {
      throw new BadRequestException('Selected plan is not available for additional companies.');
    }
  }

  private async resolveOnboardingManualCompanyId(userId: number, planId: number, dto: CreateManualCheckoutSessionDto) {
    const draft = await this.prisma.userOnboardingDraft.findUnique({
      where: {
        userId,
      },
      select: {
        billingCycle: true,
        provisionedCompanyId: true,
        subscriptionPlanId: true,
      },
    });

    if (!draft?.provisionedCompanyId) {
      throw new BadRequestException('Complete company details before starting manual checkout.');
    }

    if (draft.subscriptionPlanId !== planId || draft.billingCycle !== dto.billingCycle) {
      throw new BadRequestException('Manual checkout must match the selected onboarding plan.');
    }

    return draft.provisionedCompanyId;
  }

  private async assertCanManageCompanyBilling(user: AuthUser, companyId: number) {
    if (user.role === AppRole.SUPER_ADMIN) {
      return;
    }

    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_companyId: {
          userId: user.id,
          companyId,
        },
      },
      select: {
        role: true,
      },
    });

    if (membership?.role !== MembershipRole.ADMIN) {
      throw new ForbiddenException('Only company admins can manage billing.');
    }
  }

  private async ensureManualCompanySubscription(input: {
    companyId: number;
    ownerUserId: number;
    planId: number;
    planPriceId: number;
    billingCycle: BillingCycle;
  }) {
    const reusableStatuses = [
      SubscriptionStatus.INCOMPLETE,
      SubscriptionStatus.TRIALING,
      SubscriptionStatus.ACTIVE,
      SubscriptionStatus.PAST_DUE,
      SubscriptionStatus.UNPAID,
    ];
    const existingSubscription = await this.prisma.companySubscription.findFirst({
      where: {
        companyId: input.companyId,
        subscriptionPlanId: input.planId,
        billingCycle: input.billingCycle,
        status: {
          in: reusableStatuses,
        },
      },
      include: companySubscriptionDetailsInclude,
      orderBy: [{ startsAt: 'desc' }, { createdAt: 'desc' }],
    });

    if (existingSubscription) {
      return existingSubscription;
    }

    return this.prisma.companySubscription.create({
      data: {
        companyId: input.companyId,
        subscriptionPlanId: input.planId,
        subscriptionPlanPriceId: input.planPriceId,
        billingCycle: input.billingCycle,
        billingMode: BillingMode.MANUAL,
        autoRenew: false,
        billingProvider: BillingProvider.PAYMONGO,
        status: SubscriptionStatus.INCOMPLETE,
        startsAt: new Date(),
        rawProviderPayload: {
          billingMode: BillingMode.MANUAL,
          createdBy: 'manual_checkout_session',
          ownerUserId: input.ownerUserId,
        },
      },
      include: companySubscriptionDetailsInclude,
    });
  }

  private async ensureManualSubscriptionInvoice(input: {
    companyId: number;
    ownerUserId: number;
    companySubscriptionId: number | null;
    subscriptionPlanId: number;
    subscriptionPlanPriceId: number;
    purpose: BillingPaymentPurpose;
    billingCycle: BillingCycle;
    planCode: string;
    planName: string;
    description: string;
    amountInCents: number;
    currency: string;
    periodStart: Date;
    periodEnd: Date;
  }) {
    const existingInvoice = await this.prisma.subscriptionInvoice.findFirst({
      where: {
        companyId: input.companyId,
        ownerUserId: input.ownerUserId,
        companySubscriptionId: input.companySubscriptionId,
        subscriptionPlanId: input.subscriptionPlanId,
        subscriptionPlanPriceId: input.subscriptionPlanPriceId,
        purpose: input.purpose,
        billingMode: BillingMode.MANUAL,
        billingCycle: input.billingCycle,
        totalAmountInCents: input.amountInCents,
        currency: input.currency,
        status: SubscriptionInvoiceStatus.OPEN,
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    if (existingInvoice) {
      return existingInvoice;
    }

    const invoice = await this.prisma.subscriptionInvoice.create({
      data: {
        companyId: input.companyId,
        ownerUserId: input.ownerUserId,
        companySubscriptionId: input.companySubscriptionId,
        subscriptionPlanId: input.subscriptionPlanId,
        subscriptionPlanPriceId: input.subscriptionPlanPriceId,
        billingProvider: BillingProvider.PAYMONGO,
        status: SubscriptionInvoiceStatus.OPEN,
        purpose: input.purpose,
        billingMode: BillingMode.MANUAL,
        billingReason: input.purpose.toLowerCase(),
        planCode: input.planCode,
        planName: input.planName,
        billingCycle: input.billingCycle,
        description: input.description,
        quantity: 1,
        unitAmountInCents: input.amountInCents,
        subtotalInCents: input.amountInCents,
        discountInCents: 0,
        taxInCents: 0,
        totalAmountInCents: input.amountInCents,
        amountDueInCents: input.amountInCents,
        amountPaidInCents: 0,
        currency: input.currency,
        issuedAt: new Date(),
        dueAt: input.periodStart,
        periodStartAt: input.periodStart,
        periodEndAt: input.periodEnd,
      },
    });

    return this.prisma.subscriptionInvoice.update({
      where: {
        id: invoice.id,
      },
      data: {
        invoiceNumber: `GBN-INV-${invoice.id}`,
      },
    });
  }

  private async findReusableManualCheckoutAttempt(invoiceId: number) {
    return this.prisma.billingPaymentAttempt.findFirst({
      where: {
        subscriptionInvoiceId: invoiceId,
        status: BillingPaymentAttemptStatus.AWAITING_PAYMENT,
        applicationStatus: BillingApplicationStatus.PENDING,
      },
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  private async ensureReusableCheckoutAttemptStillExists(attempt: { id: number; externalCheckoutSessionId: string | null }) {
    if (!attempt.externalCheckoutSessionId) {
      return false;
    }

    try {
      await this.paymongoService.retrieveCheckoutSession(attempt.externalCheckoutSessionId);
      return true;
    } catch (error) {
      if (this.isPaymongoNotFound(error)) {
        await this.prisma.billingPaymentAttempt.update({
          where: { id: attempt.id },
          data: {
            status: BillingPaymentAttemptStatus.EXPIRED,
            expiredAt: new Date(),
            applicationError: 'PayMongo checkout session was not found for the current provider key; a new checkout can be created.',
          },
        });
        this.logger.warn(`Manual checkout attempt ${attempt.id} references missing PayMongo session ${attempt.externalCheckoutSessionId}; marked expired.`);

        return false;
      }

      this.logger.warn(
        `Could not verify reusable manual checkout attempt ${attempt.id}; keeping existing checkout session. ${
          error instanceof Error ? error.message : 'Unknown provider error.'
        }`,
      );
      return true;
    }
  }

  private isPaymongoNotFound(error: unknown) {
    return error instanceof PaymongoRequestException && (error.context.status === 404 || error.context.code === 'not_found');
  }

  private async createManualPaymentAttempt(input: {
    invoiceId: number;
    companyId: number;
    ownerUserId: number;
    companySubscriptionId: number | null;
    subscriptionPlanId: number;
    subscriptionPlanPriceId: number;
    purpose: BillingPaymentPurpose;
    amountInCents: number;
    currency: string;
    successUrl: string;
    cancelUrl: string;
    billingCycle: BillingCycle;
    planCode: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const latestAttempt = await tx.billingPaymentAttempt.findFirst({
        where: {
          subscriptionInvoiceId: input.invoiceId,
        },
        orderBy: {
          attemptNumber: 'desc',
        },
        select: {
          attemptNumber: true,
          status: true,
        },
      });

      if (latestAttempt?.status === BillingPaymentAttemptStatus.PAID) {
        throw new BadRequestException('This invoice already has a confirmed payment.');
      }

      return tx.billingPaymentAttempt.create({
        data: {
          subscriptionInvoiceId: input.invoiceId,
          companyId: input.companyId,
          ownerUserId: input.ownerUserId,
          companySubscriptionId: input.companySubscriptionId,
          subscriptionPlanId: input.subscriptionPlanId,
          subscriptionPlanPriceId: input.subscriptionPlanPriceId,
          purpose: input.purpose,
          billingMode: BillingMode.MANUAL,
          status: BillingPaymentAttemptStatus.PENDING,
          applicationStatus: BillingApplicationStatus.PENDING,
          billingProvider: BillingProvider.PAYMONGO,
          attemptNumber: (latestAttempt?.attemptNumber ?? 0) + 1,
          amountInCents: input.amountInCents,
          currency: input.currency,
          successUrl: input.successUrl,
          cancelUrl: input.cancelUrl,
          metadata: {
            billing_mode: BillingMode.MANUAL,
            payment_purpose: input.purpose,
            environment: this.configService.get<string>('APP_ENV') ?? 'unknown',
            company_id: input.companyId,
            owner_user_id: input.ownerUserId,
            company_subscription_id: input.companySubscriptionId,
            subscription_plan_id: input.subscriptionPlanId,
            subscription_plan_price_id: input.subscriptionPlanPriceId,
            subscription_plan_code: input.planCode,
            billing_cycle: input.billingCycle,
            local_invoice_id: input.invoiceId,
          },
        },
      });
    });
  }

  private getCheckoutUrlFromProviderPayload(payload: Prisma.JsonValue | null) {
    const data = readProviderResponseData(readProviderObject(payload));
    const attributes = readProviderResponseAttributes(data);

    return readProviderString(attributes.checkout_url) ?? readProviderString(attributes.url);
  }

  private mapSubscriptionInvoice(invoice: {
    id: number;
    externalInvoiceId: string | null;
    externalPaymentIntentId: string | null;
    status: SubscriptionInvoiceStatus;
    billingReason: string | null;
    currency: string;
    amountDueInCents: number | null;
    amountPaidInCents: number | null;
    dueAt: Date | null;
    paidAt: Date | null;
    finalizedAt: Date | null;
    periodStartAt: Date | null;
    periodEndAt: Date | null;
  }) {
    return {
      id: invoice.id,
      externalInvoiceId: invoice.externalInvoiceId,
      externalPaymentIntentId: invoice.externalPaymentIntentId,
      status: invoice.status,
      billingReason: invoice.billingReason,
      currency: invoice.currency,
      amountDueInCents: invoice.amountDueInCents,
      amountPaidInCents: invoice.amountPaidInCents,
      dueAt: invoice.dueAt,
      paidAt: invoice.paidAt,
      finalizedAt: invoice.finalizedAt,
      periodStartAt: invoice.periodStartAt,
      periodEndAt: invoice.periodEndAt,
    };
  }

  private normalizeSubscriptionInvoiceStatus(status?: string | null) {
    switch (status?.trim().toLowerCase()) {
      case 'draft':
        return SubscriptionInvoiceStatus.DRAFT;
      case 'paid':
      case 'succeeded':
        return SubscriptionInvoiceStatus.PAID;
      case 'void':
      case 'voided':
        return SubscriptionInvoiceStatus.VOID;
      case 'expired':
        return SubscriptionInvoiceStatus.EXPIRED;
      case 'uncollectible':
        return SubscriptionInvoiceStatus.UNCOLLECTIBLE;
      case 'open':
      default:
        return SubscriptionInvoiceStatus.OPEN;
    }
  }

  private addBillingInterval(start: Date, input: { intervalCount: number; intervalUnit: 'DAY' | 'MONTH' | 'YEAR' }) {
    const end = new Date(start);

    if (input.intervalUnit === 'DAY') {
      end.setDate(end.getDate() + input.intervalCount);
      return end;
    }

    if (input.intervalUnit === 'YEAR') {
      end.setFullYear(end.getFullYear() + input.intervalCount);
      return end;
    }

    end.setMonth(end.getMonth() + input.intervalCount);
    return end;
  }

  async attachPaymentMethod(user: AuthUser, subscriptionId: number, dto: AttachCompanySubscriptionPaymentMethodDto) {
    const companyId = this.getCompanyId(user);
    this.assertCompanyAdmin(user);

    return this.attachPaymentMethodForCompany({
      companyId,
      ownerUserId: user.id,
      subscriptionId,
      paymentMethodId: dto.paymentMethodId,
    });
  }

  async attachPaymentMethodForCompany(input: { companyId: number; ownerUserId: number; subscriptionId: number; paymentMethodId: string }) {
    const companyId = input.companyId;

    const subscription = await this.prisma.companySubscription.findFirst({
      where: {
        id: input.subscriptionId,
        companyId,
      },
      include: companySubscriptionDetailsInclude,
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found.');
    }

    if (!subscription.latestPaymentIntentId) {
      throw new BadRequestException('This subscription does not have a PayMongo payment intent to attach to.');
    }

    await this.assertPaymentMethodAvailableForOwner({
      ownerUserId: input.ownerUserId,
      paymentMethodId: input.paymentMethodId,
    });

    const remotePaymentIntent = await this.paymongoService.attachPaymentIntent(subscription.latestPaymentIntentId, input.paymentMethodId.trim());

    const remotePaymentIntentData = readProviderResponseData(remotePaymentIntent);
    const remotePaymentIntentAttributes = readProviderResponseAttributes(remotePaymentIntentData);
    const latestPayment = readFirstProviderArrayObject(remotePaymentIntentAttributes.payments);
    const latestPaymentAttributes = readProviderObject(latestPayment?.attributes);
    const paymentMethodDetails = readProviderObject(latestPaymentAttributes?.payment_method_details);
    const card = readProviderObject(paymentMethodDetails?.card);
    const redirect = readProviderObject(remotePaymentIntentAttributes.next_action)?.redirect;
    const redirectUrl = readProviderString(readProviderObject(redirect)?.url);

    await this.upsertDefaultPaymentMethod(this.prisma, {
      companyId,
      ownerUserId: input.ownerUserId,
      subscriptionId: subscription.id,
      paymentMethodId: input.paymentMethodId,
      type: readProviderString(paymentMethodDetails?.type) ?? 'unknown',
      brand: readProviderString(card?.brand),
      last4: readProviderString(card?.last4),
      expMonth: readProviderNumber(card?.exp_month),
      expYear: readProviderNumber(card?.exp_year),
      rawProviderPayload: remotePaymentIntent as Prisma.InputJsonValue,
    });

    await this.prisma.companySubscription.update({
      where: {
        id: subscription.id,
      },
      data: {
        externalPaymentMethodId: input.paymentMethodId.trim(),
        rawProviderPayload: remotePaymentIntent as Prisma.InputJsonValue,
      },
    });

    const updatedSubscription = await this.prisma.companySubscription.findUniqueOrThrow({
      where: { id: subscription.id },
      include: companySubscriptionDetailsInclude,
    });

    return {
      message: 'Payment method attached. Wait for webhook confirmation before treating the subscription as active.',
      subscription: mapCompanySubscription(updatedSubscription),
      paymentIntent: {
        id: readProviderString(remotePaymentIntentData.id),
        status: readProviderString(remotePaymentIntentAttributes.status),
        redirectUrl,
      },
    };
  }

  private async assertPaymentMethodAvailableForOwner(input: { ownerUserId: number; paymentMethodId: string }) {
    const existingPaymentMethod = await this.prisma.billingPaymentMethod.findUnique({
      where: {
        externalPaymentMethodId: input.paymentMethodId.trim(),
      },
      select: {
        ownerUserId: true,
      },
    });

    if (existingPaymentMethod && existingPaymentMethod.ownerUserId !== input.ownerUserId) {
      throw new ForbiddenException('This saved payment method is not available to this admin account.');
    }
  }

  private async upsertDefaultPaymentMethod(
    prisma: PrismaService | Prisma.TransactionClient,
    input: {
      companyId: number;
      ownerUserId: number;
      subscriptionId: number;
      paymentMethodId: string;
      type: string;
      brand?: string | null;
      last4?: string | null;
      expMonth?: number | null;
      expYear?: number | null;
      metadata?: Prisma.InputJsonValue;
      rawProviderPayload?: Prisma.InputJsonValue;
    },
  ) {
    const paymentMethodId = input.paymentMethodId.trim();

    await prisma.billingPaymentMethod.upsert({
      where: {
        externalPaymentMethodId: paymentMethodId,
      },
      update: {
        companyId: input.companyId,
        ownerUserId: input.ownerUserId,
        companySubscriptionId: input.subscriptionId,
        isDefault: true,
        type: input.type,
        brand: input.brand ?? null,
        last4: input.last4 ?? null,
        expMonth: input.expMonth ?? null,
        expYear: input.expYear ?? null,
        metadata: input.metadata,
        rawProviderPayload: input.rawProviderPayload,
      },
      create: {
        companyId: input.companyId,
        ownerUserId: input.ownerUserId,
        companySubscriptionId: input.subscriptionId,
        billingProvider: BillingProvider.PAYMONGO,
        externalPaymentMethodId: paymentMethodId,
        isDefault: true,
        type: input.type,
        brand: input.brand ?? null,
        last4: input.last4 ?? null,
        expMonth: input.expMonth ?? null,
        expYear: input.expYear ?? null,
        metadata: input.metadata,
        rawProviderPayload: input.rawProviderPayload,
      },
    });

    await prisma.billingPaymentMethod.updateMany({
      where: {
        companySubscriptionId: input.subscriptionId,
        externalPaymentMethodId: {
          not: paymentMethodId,
        },
      },
      data: {
        isDefault: false,
      },
    });
  }

  async supersedeOnboardingSubscriptionsForPlanChange(input: { companyId: number; nextPlanId: number; nextBillingCycle: BillingCycle }) {
    const company = await this.prisma.company.findFirst({
      where: {
        id: input.companyId,
        status: CompanyStatus.PROVISIONING,
      },
      select: {
        id: true,
      },
    });

    if (!company) {
      return;
    }

    const subscriptions = await this.prisma.companySubscription.findMany({
      where: {
        companyId: input.companyId,
        status: {
          in: [SubscriptionStatus.INCOMPLETE, SubscriptionStatus.TRIALING],
        },
        OR: [
          {
            subscriptionPlanId: {
              not: input.nextPlanId,
            },
          },
          {
            billingCycle: {
              not: input.nextBillingCycle,
            },
          },
        ],
      },
      select: {
        id: true,
        status: true,
        externalSubscriptionId: true,
      },
      orderBy: [{ startsAt: 'desc' }, { createdAt: 'desc' }],
    });

    for (const subscription of subscriptions) {
      let remoteCancellation: Record<string, unknown> | null = null;

      if (subscription.externalSubscriptionId) {
        remoteCancellation = await this.paymongoService.cancelSubscription(subscription.externalSubscriptionId);
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.companySubscription.update({
          where: {
            id: subscription.id,
          },
          data: {
            cancelAtPeriodEnd: false,
            canceledAt: new Date(),
            status: subscription.status === SubscriptionStatus.INCOMPLETE ? SubscriptionStatus.INCOMPLETE_CANCELED : SubscriptionStatus.CANCELED,
            failureCode: 'superseded_by_onboarding_plan_change',
            failureMessage: 'Subscription was superseded by an onboarding plan change.',
            ...(remoteCancellation
              ? {
                  rawProviderPayload: remoteCancellation as Prisma.InputJsonValue,
                }
              : {}),
          },
        });

        await tx.billingPaymentMethod.updateMany({
          where: {
            companySubscriptionId: subscription.id,
          },
          data: {
            isDefault: false,
          },
        });
      });
    }
  }

  async cancelSubscription(user: AuthUser, subscriptionId: number, dto: CancelCompanySubscriptionDto) {
    const companyId = this.getCompanyId(user);
    this.assertCompanyAdmin(user);

    const subscription = await this.prisma.companySubscription.findFirst({
      where: {
        id: subscriptionId,
        companyId,
      },
      include: companySubscriptionDetailsInclude,
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found.');
    }

    let remoteCancellation: Record<string, unknown> | null = null;

    if (subscription.externalSubscriptionId) {
      remoteCancellation = await this.paymongoService.cancelSubscription(subscription.externalSubscriptionId);
    }

    const updatedSubscription = await this.prisma.companySubscription.update({
      where: {
        id: subscription.id,
      },
      data: {
        cancelAtPeriodEnd: dto.cancelAtPeriodEnd ?? false,
        canceledAt: new Date(),
        status: subscription.externalSubscriptionId ? subscription.status : SubscriptionStatus.CANCELED,
        ...(remoteCancellation
          ? {
              rawProviderPayload: remoteCancellation as Prisma.InputJsonValue,
            }
          : {}),
      },
      include: companySubscriptionDetailsInclude,
    });

    return {
      message: 'Subscription cancellation requested. Final local status should still be confirmed by webhook updates.',
      subscription: mapCompanySubscription(updatedSubscription),
    };
  }

  private async ensureBillingCustomer(input: {
    companyId: number;
    ownerUserId: number;
    companyName: string;
    ownerFirstName?: string | null;
    ownerLastName?: string | null;
    contactNumber?: string | null;
    preferredEmail?: string | null;
    fallbackEmail: string;
  }) {
    const existingCustomer = await this.prisma.billingCustomer.findUnique({
      where: {
        companyId_billingProvider: {
          companyId: input.companyId,
          billingProvider: BillingProvider.PAYMONGO,
        },
      },
    });

    if (existingCustomer) {
      return existingCustomer;
    }

    const normalizedPhone = this.normalizePaymongoPhone(input.contactNumber);
    const preferredEmail = input.preferredEmail ? (normalizeEmail(input.preferredEmail) as string) : null;
    const customerEmail = preferredEmail ?? input.fallbackEmail;
    const existingOwnerCustomer = await this.prisma.billingCustomer.findFirst({
      where: {
        ownerUserId: input.ownerUserId,
        billingProvider: BillingProvider.PAYMONGO,
        email: customerEmail,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (existingOwnerCustomer) {
      return existingOwnerCustomer;
    }

    const { firstName, lastName } = this.resolveCustomerName({
      companyName: input.companyName,
      ownerFirstName: input.ownerFirstName,
      ownerLastName: input.ownerLastName,
    });

    let remoteCustomer: Record<string, unknown> | null = null;

    try {
      remoteCustomer = await this.paymongoService.createCustomer({
        email: customerEmail,
        firstName,
        lastName,
        name: input.companyName,
        phone: normalizedPhone,
        metadata: {
          company_id: input.companyId,
          owner_user_id: input.ownerUserId,
        },
      });
    } catch (error) {
      if (!this.isExistingCustomerEmailError(error)) {
        throw error;
      }

      remoteCustomer = await this.paymongoService.retrieveCustomerByEmail(customerEmail);
    }

    if (!remoteCustomer) {
      throw new BadRequestException('PayMongo customer lookup did not return a customer payload.');
    }

    const remoteCustomerData = readProviderResponseData(remoteCustomer);
    const remoteCustomerAttributes = readProviderResponseAttributes(remoteCustomerData);
    const externalCustomerId = readProviderString(remoteCustomerData.id);

    if (!externalCustomerId) {
      throw new BadRequestException('PayMongo customer response did not include an id.');
    }

    const existingExternalCustomer = await this.prisma.billingCustomer.findUnique({
      where: {
        externalCustomerId,
      },
    });

    if (existingExternalCustomer) {
      return existingExternalCustomer;
    }

    return this.prisma.billingCustomer.create({
      data: {
        companyId: input.companyId,
        ownerUserId: input.ownerUserId,
        billingProvider: BillingProvider.PAYMONGO,
        externalCustomerId,
        email: readProviderString(remoteCustomerAttributes.email) ?? customerEmail,
        name: readProviderString(remoteCustomerAttributes.name) ?? `${firstName} ${lastName}`.trim(),
        phone: readProviderString(remoteCustomerAttributes.phone) ?? normalizedPhone,
        metadata: {
          companyId: input.companyId,
          ownerUserId: input.ownerUserId,
        },
        rawProviderPayload: remoteCustomer as Prisma.InputJsonValue,
      },
    });
  }

  private async ensureExternalPlanId(
    plan: {
      id: number;
      code: string;
      name: string;
      description: string | null;
      currency: string;
      trialDays: number;
    },
    planPrice: {
      id: number;
      billingCycle: BillingCycle;
      intervalCount: number;
      intervalUnit: 'DAY' | 'MONTH' | 'YEAR';
      priceInCents: number;
      externalPlanId: string | null;
    },
    billingCycle: BillingCycle,
  ) {
    if (planPrice.externalPlanId) {
      return planPrice.externalPlanId;
    }

    const remotePlan = await this.paymongoService.createPlan({
      name: `${plan.name} ${this.getBillingCycleLabel(billingCycle)}`,
      description: plan.description,
      amountInCents: planPrice.priceInCents,
      currency: plan.currency,
      interval: this.getProviderInterval(planPrice.intervalUnit),
      intervalCount: planPrice.intervalCount,
      trialDays: plan.trialDays,
      metadata: {
        local_plan_code: plan.code,
        local_plan_price_id: planPrice.id,
        local_billing_cycle: billingCycle,
      },
    });

    const remotePlanData = readProviderResponseData(remotePlan);
    const externalPlanId = readProviderString(remotePlanData.id);

    if (!externalPlanId) {
      throw new BadRequestException('PayMongo plan response did not include an id.');
    }

    await this.prisma.subscriptionPlanPrice.update({
      where: {
        id: planPrice.id,
      },
      data: {
        externalPlanId,
        billingMetadata: remotePlan as Prisma.InputJsonValue,
      },
    });

    return externalPlanId;
  }

  private getBillingCycleLabel(billingCycle: BillingCycle) {
    switch (billingCycle) {
      case BillingCycle.MONTHLY:
        return 'Monthly';
      case BillingCycle.QUARTERLY:
        return 'Quarterly';
      case BillingCycle.YEARLY:
        return 'Yearly';
    }
  }

  private withQueryParams(url: string, params: Record<string, string>) {
    const parsedUrl = new URL(url);

    for (const [key, value] of Object.entries(params)) {
      parsedUrl.searchParams.set(key, value);
    }

    return parsedUrl.toString();
  }

  private getProviderInterval(intervalUnit: 'DAY' | 'MONTH' | 'YEAR') {
    if (intervalUnit === 'DAY') {
      throw new BadRequestException('Daily billing intervals are not supported by PayMongo plans.');
    }

    return intervalUnit === 'MONTH' ? 'month' : 'year';
  }

  private async getCompanyAdminEmail(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
      },
    });

    if (!user?.email) {
      throw new NotFoundException('User email not found for billing setup.');
    }

    return normalizeEmail(user.email) as string;
  }

  private normalizePaymongoPhone(value: string | null | undefined) {
    if (!value) {
      return undefined;
    }

    const digitsOnly = value.replace(/\D/g, '');

    if (digitsOnly.startsWith('63') && digitsOnly.length >= 12) {
      return `+${digitsOnly}`;
    }

    if (digitsOnly.startsWith('0') && digitsOnly.length >= 11) {
      return `+63${digitsOnly.slice(1)}`;
    }

    if (digitsOnly.length >= 10) {
      return `+63${digitsOnly.slice(-10)}`;
    }

    return undefined;
  }

  private resolveCustomerName(input: { companyName: string; ownerFirstName?: string | null; ownerLastName?: string | null }) {
    const firstName = input.ownerFirstName?.trim();
    const lastName = input.ownerLastName?.trim();

    if (firstName && lastName) {
      return { firstName, lastName };
    }

    const companyWords = input.companyName.trim().split(/\s+/).filter(Boolean);

    return {
      firstName: companyWords[0] ?? 'Company',
      lastName: companyWords.slice(1).join(' ') || 'Customer',
    };
  }

  private isExistingCustomerEmailError(error: unknown) {
    if (!(error instanceof Error)) {
      return false;
    }

    if (error instanceof PaymongoRequestException && error.context.code === 'resource_already_exists' && error.context.source === 'data.attributes.email') {
      return true;
    }

    return error.message.includes('A customer with this email already exists');
  }

  private getCompanyId(user: AuthUser) {
    if (!user.companyId) {
      throw new ForbiddenException('An active company context is required.');
    }

    return user.companyId;
  }

  private assertCompanyAdmin(user: AuthUser) {
    if (user.role === AppRole.SUPER_ADMIN) {
      return;
    }

    if (user.membershipRole !== MembershipRole.ADMIN) {
      throw new ForbiddenException('Only company admins can manage billing.');
    }
  }
}
