import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import {
  BillingCycle,
  BillingProvider,
  MembershipRole,
  Prisma,
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
import { SubscribeCompanyDto } from './dto/subscribe-company.dto';
import {
  PaymongoRequestException,
  PaymongoService,
} from './services/paymongo.service';
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
  private readonly pendingProviderActivationCode =
    'pending_provider_activation';
  private readonly pendingProviderActivationMessage =
    'Billing setup is pending while PayMongo subscription billing is being activated.';

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymongoService: PaymongoService,
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
            ...(normalizedScope ? { scope: normalizedScope } : {}),
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
            modules: {
              orderBy: [{ moduleKey: 'asc' }],
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
    const [plansResponse, subscriptionResponse] = await Promise.all([
      this.listPlans(scope),
      this.getCurrentSubscription(user),
    ]);

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

    const planPrice = plan.prices.find(
      (price) => price.billingCycle === input.billingCycle,
    );

    if (!planPrice) {
      throw new BadRequestException(
        'Selected billing interval is not available for this plan.',
      );
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
        const existingSubscription =
          await this.prisma.companySubscription.findUniqueOrThrow({
            where: {
              id: latestSubscription.id,
            },
            include: companySubscriptionDetailsInclude,
          });

        return {
          message:
            existingSubscription.failureCode ===
            this.pendingProviderActivationCode
              ? this.pendingProviderActivationMessage
              : 'Subscription already exists. Attach a payment method and wait for webhook confirmation before granting paid access.',
          subscription: mapCompanySubscription(existingSubscription),
          paymentSetup: {
            latestInvoiceId: existingSubscription.latestInvoiceExternalId,
            latestPaymentIntentId: existingSubscription.latestPaymentIntentId,
          },
          pendingProviderActivation:
            existingSubscription.failureCode ===
            this.pendingProviderActivationCode,
        };
      }

      throw new BadRequestException(
        'This company already has an in-flight or active subscription. Cancel or settle it first.',
      );
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

    if (this.isProviderFallbackEnabled()) {
      const billingCustomer =
        await this.ensurePendingProviderBillingCustomer(customerInput);
      const pendingSubscription =
        await this.createPendingProviderActivationSubscription({
          companyId,
          planId: plan.id,
          planPriceId: planPrice.id,
          billingCycle: input.billingCycle,
          billingCustomerId: billingCustomer.id,
          externalCustomerId: billingCustomer.externalCustomerId,
        });

      return {
        message: this.pendingProviderActivationMessage,
        subscription: mapCompanySubscription(pendingSubscription),
        paymentSetup: {
          latestInvoiceId: null,
          latestPaymentIntentId: null,
        },
        pendingProviderActivation: true,
      };
    }

    const billingCustomer = await this.ensureBillingCustomer(customerInput);

    try {
      const externalPlanId = await this.ensureExternalPlanId(
        plan,
        planPrice,
        input.billingCycle,
      );

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

      const remoteSubscriptionData =
        readProviderResponseData(remoteSubscription);
      const remoteSubscriptionAttributes = readProviderResponseAttributes(
        remoteSubscriptionData,
      );
      const latestInvoice = readProviderObject(
        remoteSubscriptionAttributes.latest_invoice,
      );
      const latestInvoiceAttributes = readProviderObject(
        latestInvoice?.attributes,
      );
      const latestPaymentIntent = readProviderObject(
        latestInvoice?.payment_intent,
      );

      const createdSubscription = await this.prisma.$transaction(async (tx) => {
        const subscription = await tx.companySubscription.create({
          data: {
            companyId,
            subscriptionPlanId: plan.id,
            subscriptionPlanPriceId: planPrice.id,
            billingCustomerId: billingCustomer.id,
            billingCycle: input.billingCycle,
            billingProvider: BillingProvider.PAYMONGO,
            status: mapProviderSubscriptionStatus(
              readProviderString(remoteSubscriptionAttributes.status) ??
                'incomplete',
            ),
            externalCustomerId: billingCustomer.externalCustomerId,
            externalSubscriptionId: readProviderString(
              remoteSubscriptionData.id,
            ),
            externalPlanId,
            latestInvoiceExternalId: readProviderString(latestInvoice?.id),
            latestPaymentIntentId: readProviderString(latestPaymentIntent?.id),
            startsAt:
              readProviderUnixDate(remoteSubscriptionAttributes.created_at) ??
              new Date(),
            currentPeriodStartAt:
              readProviderUnixDate(remoteSubscriptionAttributes.created_at) ??
              null,
            nextBillingAt: readProviderUnixDate(
              remoteSubscriptionAttributes.next_billing_schedule,
            ),
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
              externalPaymentIntentId: readProviderString(
                latestPaymentIntent?.id,
              ),
              status:
                readProviderString(latestInvoiceAttributes?.status) ?? 'draft',
              billingReason:
                readProviderString(latestInvoiceAttributes?.billing_reason) ??
                'subscription_create',
              currency: plan.currency,
              amountDueInCents: readProviderNumber(
                latestInvoiceAttributes?.amount_due,
              ),
              amountPaidInCents: readProviderNumber(
                latestInvoiceAttributes?.amount_paid,
              ),
              dueAt: readProviderUnixDate(latestInvoiceAttributes?.due_at),
              paidAt: readProviderUnixDate(latestInvoiceAttributes?.paid_at),
              finalizedAt: readProviderUnixDate(
                latestInvoiceAttributes?.finalized_at,
              ),
              rawProviderPayload: remoteSubscription as Prisma.InputJsonValue,
            },
            create: {
              companySubscriptionId: subscription.id,
              billingProvider: BillingProvider.PAYMONGO,
              externalInvoiceId: latestInvoiceId,
              externalPaymentIntentId: readProviderString(
                latestPaymentIntent?.id,
              ),
              status:
                readProviderString(latestInvoiceAttributes?.status) ?? 'draft',
              billingReason:
                readProviderString(latestInvoiceAttributes?.billing_reason) ??
                'subscription_create',
              currency: plan.currency,
              amountDueInCents: readProviderNumber(
                latestInvoiceAttributes?.amount_due,
              ),
              amountPaidInCents: readProviderNumber(
                latestInvoiceAttributes?.amount_paid,
              ),
              dueAt: readProviderUnixDate(latestInvoiceAttributes?.due_at),
              paidAt: readProviderUnixDate(latestInvoiceAttributes?.paid_at),
              finalizedAt: readProviderUnixDate(
                latestInvoiceAttributes?.finalized_at,
              ),
              rawProviderPayload: remoteSubscription as Prisma.InputJsonValue,
            },
          });
        }

        return tx.companySubscription.findUniqueOrThrow({
          where: { id: subscription.id },
          include: companySubscriptionDetailsInclude,
        });
      });

      this.logger.log(
        `Created PayMongo subscription ${createdSubscription.externalSubscriptionId ?? 'unknown'} for company ${companyId}.`,
      );

      return {
        message:
          'Subscription created. Attach a payment method and wait for webhook confirmation before granting paid access.',
        subscription: mapCompanySubscription(createdSubscription),
        paymentSetup: {
          latestInvoiceId: createdSubscription.latestInvoiceExternalId,
          latestPaymentIntentId: createdSubscription.latestPaymentIntentId,
        },
        pendingProviderActivation: false,
      };
    } catch (error) {
      if (!this.isProviderActivationPendingError(error)) {
        throw error;
      }

      const pendingSubscription =
        await this.createPendingProviderActivationSubscription({
          companyId,
          planId: plan.id,
          planPriceId: planPrice.id,
          billingCycle: input.billingCycle,
          billingCustomerId: billingCustomer.id,
          externalCustomerId: billingCustomer.externalCustomerId,
        });

      return {
        message: this.pendingProviderActivationMessage,
        subscription: mapCompanySubscription(pendingSubscription),
        paymentSetup: {
          latestInvoiceId: null,
          latestPaymentIntentId: null,
        },
        pendingProviderActivation: true,
      };
    }
  }

  private async createPendingProviderActivationSubscription(input: {
    companyId: number;
    planId: number;
    planPriceId: number | null;
    billingCycle: BillingCycle;
    billingCustomerId: number;
    externalCustomerId: string;
  }) {
    return this.prisma.companySubscription.create({
      data: {
        companyId: input.companyId,
        subscriptionPlanId: input.planId,
        subscriptionPlanPriceId: input.planPriceId,
        billingCustomerId: input.billingCustomerId,
        billingCycle: input.billingCycle,
        billingProvider: BillingProvider.PAYMONGO,
        status: SubscriptionStatus.INCOMPLETE,
        externalCustomerId: input.externalCustomerId,
        failureCode: this.pendingProviderActivationCode,
        failureMessage: this.pendingProviderActivationMessage,
        startsAt: new Date(),
        rawProviderPayload: {
          fallbackState: 'pending_billing_setup',
          providerState: 'pending_provider_activation',
        },
      },
      include: companySubscriptionDetailsInclude,
    });
  }

  private async ensurePendingProviderBillingCustomer(input: {
    companyId: number;
    ownerUserId: number;
    companyName: string;
    contactNumber?: string | null;
    preferredEmail?: string | null;
    fallbackEmail: string;
  }) {
    const customerEmail = input.preferredEmail
      ? (normalizeEmail(input.preferredEmail) as string)
      : input.fallbackEmail;
    const externalCustomerId = `pending_provider_activation_company_${input.companyId}`;

    return this.prisma.billingCustomer.upsert({
      where: {
        companyId_billingProvider: {
          companyId: input.companyId,
          billingProvider: BillingProvider.PAYMONGO,
        },
      },
      update: {
        ownerUserId: input.ownerUserId,
        externalCustomerId,
        email: customerEmail,
        name: input.companyName,
        phone: this.normalizePaymongoPhone(input.contactNumber),
        metadata: {
          companyId: input.companyId,
          ownerUserId: input.ownerUserId,
          paymentSetupState: this.pendingProviderActivationCode,
        },
        rawProviderPayload: {
          fallbackState: 'pending_billing_customer',
          providerState: 'pending_provider_activation',
        },
      },
      create: {
        companyId: input.companyId,
        ownerUserId: input.ownerUserId,
        billingProvider: BillingProvider.PAYMONGO,
        externalCustomerId,
        email: customerEmail,
        name: input.companyName,
        phone: this.normalizePaymongoPhone(input.contactNumber),
        metadata: {
          companyId: input.companyId,
          ownerUserId: input.ownerUserId,
          paymentSetupState: this.pendingProviderActivationCode,
        },
        rawProviderPayload: {
          fallbackState: 'pending_billing_customer',
          providerState: 'pending_provider_activation',
        },
      },
    });
  }

  async attachPaymentMethod(
    user: AuthUser,
    subscriptionId: number,
    dto: AttachCompanySubscriptionPaymentMethodDto,
  ) {
    const companyId = this.getCompanyId(user);
    this.assertCompanyAdmin(user);

    return this.attachPaymentMethodForCompany({
      companyId,
      ownerUserId: user.id,
      subscriptionId,
      paymentMethodId: dto.paymentMethodId,
    });
  }

  async attachPaymentMethodForCompany(input: {
    companyId: number;
    ownerUserId: number;
    subscriptionId: number;
    paymentMethodId: string;
  }) {
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

    if (
      !subscription.latestPaymentIntentId &&
      subscription.failureCode === this.pendingProviderActivationCode
    ) {
      return {
        message: this.pendingProviderActivationMessage,
        subscription: mapCompanySubscription(subscription),
        paymentIntent: {
          id: null,
          status: this.pendingProviderActivationCode,
          redirectUrl: null,
        },
        pendingProviderActivation: true,
      };
    }

    if (!subscription.latestPaymentIntentId) {
      throw new BadRequestException(
        'This subscription does not have a PayMongo payment intent to attach to.',
      );
    }

    await this.assertPaymentMethodAvailableForOwner({
      ownerUserId: input.ownerUserId,
      paymentMethodId: input.paymentMethodId,
    });

    const remotePaymentIntent = await this.paymongoService.attachPaymentIntent(
      subscription.latestPaymentIntentId,
      input.paymentMethodId.trim(),
    );

    const remotePaymentIntentData =
      readProviderResponseData(remotePaymentIntent);
    const remotePaymentIntentAttributes = readProviderResponseAttributes(
      remotePaymentIntentData,
    );
    const latestPayment = readFirstProviderArrayObject(
      remotePaymentIntentAttributes.payments,
    );
    const latestPaymentAttributes = readProviderObject(
      latestPayment?.attributes,
    );
    const paymentMethodDetails = readProviderObject(
      latestPaymentAttributes?.payment_method_details,
    );
    const card = readProviderObject(paymentMethodDetails?.card);
    const redirect = readProviderObject(
      remotePaymentIntentAttributes.next_action,
    )?.redirect;
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

    const updatedSubscription =
      await this.prisma.companySubscription.findUniqueOrThrow({
        where: { id: subscription.id },
        include: companySubscriptionDetailsInclude,
      });

    return {
      message:
        'Payment method attached. Wait for webhook confirmation before treating the subscription as active.',
      subscription: mapCompanySubscription(updatedSubscription),
      paymentIntent: {
        id: readProviderString(remotePaymentIntentData.id),
        status: readProviderString(remotePaymentIntentAttributes.status),
        redirectUrl,
      },
      pendingProviderActivation: false,
    };
  }

  async recordPendingPaymentSetup(input: {
    companyId: number;
    ownerUserId: number;
    subscriptionId: number;
    paymentMethodId: string;
    brand?: string | null;
    last4?: string | null;
    expMonth?: number | null;
    expYear?: number | null;
  }) {
    const subscription = await this.prisma.companySubscription.findFirst({
      where: {
        id: input.subscriptionId,
        companyId: input.companyId,
      },
      include: companySubscriptionDetailsInclude,
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found.');
    }

    await this.assertPaymentMethodAvailableForOwner({
      ownerUserId: input.ownerUserId,
      paymentMethodId: input.paymentMethodId,
    });

    await this.upsertDefaultPaymentMethod(this.prisma, {
      companyId: input.companyId,
      ownerUserId: input.ownerUserId,
      subscriptionId: subscription.id,
      paymentMethodId: input.paymentMethodId,
      type: 'card',
      brand: input.brand ?? null,
      last4: input.last4 ?? null,
      expMonth: input.expMonth ?? null,
      expYear: input.expYear ?? null,
      metadata: {
        paymentSetupState: this.pendingProviderActivationCode,
      },
    });

    await this.prisma.companySubscription.update({
      where: {
        id: subscription.id,
      },
      data: {
        externalPaymentMethodId: input.paymentMethodId.trim(),
      },
    });

    const updatedSubscription =
      await this.prisma.companySubscription.findUniqueOrThrow({
        where: { id: subscription.id },
        include: companySubscriptionDetailsInclude,
      });

    return {
      message: this.pendingProviderActivationMessage,
      subscription: mapCompanySubscription(updatedSubscription),
      pendingProviderActivation: true,
    };
  }

  private async assertPaymentMethodAvailableForOwner(input: {
    ownerUserId: number;
    paymentMethodId: string;
  }) {
    const existingPaymentMethod =
      await this.prisma.billingPaymentMethod.findUnique({
        where: {
          externalPaymentMethodId: input.paymentMethodId.trim(),
        },
        select: {
          ownerUserId: true,
        },
      });

    if (
      existingPaymentMethod &&
      existingPaymentMethod.ownerUserId !== input.ownerUserId
    ) {
      throw new ForbiddenException(
        'This saved payment method is not available to this admin account.',
      );
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

  async cancelSubscription(
    user: AuthUser,
    subscriptionId: number,
    dto: CancelCompanySubscriptionDto,
  ) {
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
      remoteCancellation = await this.paymongoService.cancelSubscription(
        subscription.externalSubscriptionId,
      );
    }

    const updatedSubscription = await this.prisma.companySubscription.update({
      where: {
        id: subscription.id,
      },
      data: {
        cancelAtPeriodEnd: dto.cancelAtPeriodEnd ?? false,
        canceledAt: new Date(),
        status: subscription.externalSubscriptionId
          ? subscription.status
          : SubscriptionStatus.CANCELED,
        ...(remoteCancellation
          ? {
              rawProviderPayload: remoteCancellation as Prisma.InputJsonValue,
            }
          : {}),
      },
      include: companySubscriptionDetailsInclude,
    });

    return {
      message:
        'Subscription cancellation requested. Final local status should still be confirmed by webhook updates.',
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
    const preferredEmail = input.preferredEmail
      ? (normalizeEmail(input.preferredEmail) as string)
      : null;
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

      remoteCustomer =
        await this.paymongoService.retrieveCustomerByEmail(customerEmail);
    }

    if (!remoteCustomer) {
      throw new BadRequestException(
        'PayMongo customer lookup did not return a customer payload.',
      );
    }

    const remoteCustomerData = readProviderResponseData(remoteCustomer);
    const remoteCustomerAttributes =
      readProviderResponseAttributes(remoteCustomerData);
    const externalCustomerId = readProviderString(remoteCustomerData.id);

    if (!externalCustomerId) {
      throw new BadRequestException(
        'PayMongo customer response did not include an id.',
      );
    }

    const existingExternalCustomer =
      await this.prisma.billingCustomer.findUnique({
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
        email:
          readProviderString(remoteCustomerAttributes.email) ?? customerEmail,
        name:
          readProviderString(remoteCustomerAttributes.name) ??
          `${firstName} ${lastName}`.trim(),
        phone:
          readProviderString(remoteCustomerAttributes.phone) ?? normalizedPhone,
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
      throw new BadRequestException(
        'PayMongo plan response did not include an id.',
      );
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

  private getProviderInterval(intervalUnit: 'DAY' | 'MONTH' | 'YEAR') {
    if (intervalUnit === 'DAY') {
      throw new BadRequestException(
        'Daily billing intervals are not supported by PayMongo plans.',
      );
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

  private resolveCustomerName(input: {
    companyName: string;
    ownerFirstName?: string | null;
    ownerLastName?: string | null;
  }) {
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

  private isProviderActivationPendingError(error: unknown) {
    if (!(error instanceof Error)) {
      return false;
    }

    if (
      error instanceof PaymongoRequestException &&
      error.context.code === 'payment_method_not_configured'
    ) {
      return this.isProviderFallbackEnabled();
    }

    const providerNotReadyMessages = [
      'Subscriptions is not yet configured for this organization.',
      'no subscription payment methods are configured for this organization',
    ];

    if (
      error.message.includes(
        'Subscriptions is not yet configured for this organization.',
      )
    ) {
      return true;
    }

    if (!this.isProviderFallbackEnabled()) {
      return false;
    }

    return providerNotReadyMessages.some((message) =>
      error.message.includes(message),
    );
  }

  private isProviderFallbackEnabled() {
    return (
      this.configService
        .get<string>('PAYMONGO_ALLOW_PROVIDER_FALLBACK', 'false')
        .trim()
        .toLowerCase() === 'true'
    );
  }

  private isExistingCustomerEmailError(error: unknown) {
    if (!(error instanceof Error)) {
      return false;
    }

    if (
      error instanceof PaymongoRequestException &&
      error.context.code === 'resource_already_exists' &&
      error.context.source === 'data.attributes.email'
    ) {
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
