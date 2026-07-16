import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import {
  BillingApplicationStatus,
  BillingPaymentAttemptStatus,
  BillingProvider,
  BillingWebhookEvent,
  Prisma,
  SubscriptionInvoiceStatus,
  SubscriptionStatus,
  WebhookProcessingStatus,
} from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../../../prisma/prisma.service';
import { PaymongoWebhookEventEnvelope } from '../types/paymongo-webhook-event.type';
import {
  readFirstProviderArrayObject,
  readProviderNumber,
  readProviderObject,
  readProviderString,
  readProviderUnixDate,
} from '../utils/ProviderPayload.util';
import {
  deriveSubscriptionStatusFromWebhookEvent,
  mapProviderSubscriptionStatus,
} from '../utils/SubscriptionStatus.util';
import { BillingPaymentApplicationService } from './billing-payment-application.service';
import { PaymongoService } from './paymongo.service';

@Injectable()
export class PaymongoWebhookService {
  private readonly logger = new Logger(PaymongoWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymongoService: PaymongoService,
    private readonly paymentApplicationService: BillingPaymentApplicationService,
  ) {}

  async handleWebhook(
    rawBody: Buffer | string | undefined,
    signatureHeader: string | undefined,
  ) {
    if (!rawBody || !signatureHeader) {
      throw new BadRequestException(
        'Missing webhook body or Paymongo-Signature header.',
      );
    }

    const rawPayload = Buffer.isBuffer(rawBody)
      ? rawBody.toString('utf8')
      : rawBody;
    const signatureParts = this.parseSignature(signatureHeader);
    const payload = this.parsePayload(rawPayload);
    const event = this.extractEvent(payload);

    this.verifySignature(rawPayload, signatureParts, event.isLiveMode);

    const existingEvent = await this.prisma.billingWebhookEvent.findUnique({
      where: {
        billingProvider_eventId: {
          billingProvider: BillingProvider.PAYMONGO,
          eventId: event.eventId,
        },
      },
    });

    if (existingEvent?.processingStatus === WebhookProcessingStatus.PROCESSED) {
      return {
        acknowledged: true,
        duplicate: true,
        eventId: event.eventId,
        eventType: event.eventType,
      };
    }

    const webhookEvent = existingEvent
      ? await this.markEventAttempt(existingEvent.id)
      : await this.prisma.billingWebhookEvent.create({
          data: {
            billingProvider: BillingProvider.PAYMONGO,
            eventId: event.eventId,
            eventType: event.eventType,
            isLiveMode: event.isLiveMode,
            signature: signatureHeader,
            payload: payload as Prisma.InputJsonValue,
            processingStatus: WebhookProcessingStatus.RECEIVED,
            processingAttempts: 1,
          },
        });

    try {
      await this.processEvent(webhookEvent, event);
      return {
        acknowledged: true,
        duplicate: false,
        eventId: event.eventId,
        eventType: event.eventType,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Webhook processing failed.';

      await this.prisma.billingWebhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          processingStatus: WebhookProcessingStatus.FAILED,
          lastError: message,
        },
      });

      this.logger.error(
        `Failed to process webhook ${event.eventType} (${event.eventId}): ${message}`,
      );
      throw new InternalServerErrorException('Webhook processing failed.');
    }
  }

  private async processEvent(
    webhookEvent: BillingWebhookEvent,
    event: ReturnType<PaymongoWebhookService['extractEvent']>,
  ) {
    await this.prisma.billingWebhookEvent.update({
      where: { id: webhookEvent.id },
      data: {
        processingStatus: WebhookProcessingStatus.PROCESSING,
        processingStartedAt: new Date(),
      },
    });

    let ignored = false;

    switch (event.eventType) {
      case 'subscription.activated':
      case 'subscription.updated':
      case 'subscription.past_due':
      case 'subscription.unpaid':
        await this.processSubscriptionEvent(event);
        break;
      case 'subscription.invoice.created':
      case 'subscription.invoice.finalized':
      case 'subscription.invoice.paid':
      case 'subscription.invoice.payment_failed':
        await this.processSubscriptionInvoiceEvent(event);
        break;
      case 'payment.paid':
      case 'payment.failed':
        await this.processPaymentEvent(event);
        break;
      case 'checkout_session.payment.paid':
        await this.processManualCheckoutPaidEvent(event);
        break;
      case 'checkout_session.payment.failed':
      case 'checkout_session.expired':
      case 'checkout_session.payment.expired':
      case 'checkout_session.payment.cancelled':
      case 'checkout_session.payment.canceled':
        await this.processManualCheckoutTerminalEvent(event);
        break;
      default:
        this.logger.log(
          `Unhandled PayMongo webhook event received: ${event.eventType}`,
        );
        ignored = true;
        break;
    }

    await this.prisma.billingWebhookEvent.update({
      where: { id: webhookEvent.id },
      data: {
        processingStatus: ignored
          ? WebhookProcessingStatus.IGNORED
          : WebhookProcessingStatus.PROCESSED,
        processedAt: new Date(),
        lastError: null,
      },
    });
  }

  private async processSubscriptionEvent(
    event: ReturnType<PaymongoWebhookService['extractEvent']>,
  ) {
    const subscriptionId = event.resourceId;

    if (!subscriptionId) {
      this.logger.warn(`Skipping ${event.eventType}: missing subscription id.`);
      return;
    }

    const subscription = await this.prisma.companySubscription.findUnique({
      where: {
        externalSubscriptionId: subscriptionId,
      },
    });

    if (!subscription) {
      this.logger.warn(
        `Skipping ${event.eventType}: local subscription not found for ${subscriptionId}.`,
      );
      return;
    }

    const attributes = event.resourceAttributes;
    const latestInvoice = readProviderObject(attributes.latest_invoice);
    const latestInvoicePaymentIntent = readProviderObject(
      latestInvoice?.payment_intent,
    );

    await this.prisma.companySubscription.update({
      where: { id: subscription.id },
      data: {
        status: mapProviderSubscriptionStatus(
          readProviderString(attributes.status) ??
            deriveSubscriptionStatusFromWebhookEvent(event.eventType),
        ),
        externalCustomerId:
          readProviderString(attributes.customer_id) ??
          subscription.externalCustomerId,
        externalPlanId:
          readProviderString(attributes.plan_id) ?? subscription.externalPlanId,
        externalPaymentMethodId:
          readProviderString(attributes.default_customer_payment_method_id) ??
          subscription.externalPaymentMethodId,
        latestInvoiceExternalId:
          readProviderString(latestInvoice?.id) ??
          subscription.latestInvoiceExternalId,
        latestPaymentIntentId:
          readProviderString(latestInvoicePaymentIntent?.id) ??
          subscription.latestPaymentIntentId,
        nextBillingAt:
          readProviderUnixDate(attributes.next_billing_schedule) ??
          subscription.nextBillingAt,
        startsAt:
          readProviderUnixDate(attributes.created_at) ?? subscription.startsAt,
        canceledAt:
          readProviderUnixDate(attributes.cancelled_at) ??
          subscription.canceledAt,
        currentPeriodStartAt:
          readProviderUnixDate(attributes.current_billing_period_start) ??
          subscription.currentPeriodStartAt,
        rawProviderPayload: event.payload as Prisma.InputJsonValue,
      },
    });
  }

  private async processSubscriptionInvoiceEvent(
    event: ReturnType<PaymongoWebhookService['extractEvent']>,
  ) {
    const attributes = event.resourceAttributes;
    const subscriptionId = readProviderString(attributes.subscription_id);

    if (!subscriptionId) {
      this.logger.warn(`Skipping ${event.eventType}: missing subscription_id.`);
      return;
    }

    const subscription = await this.prisma.companySubscription.findUnique({
      where: {
        externalSubscriptionId: subscriptionId,
      },
    });

    if (!subscription) {
      this.logger.warn(
        `Skipping ${event.eventType}: local subscription not found for ${subscriptionId}.`,
      );
      return;
    }

    const invoiceId = event.resourceId;

    if (!invoiceId) {
      this.logger.warn(`Skipping ${event.eventType}: missing invoice id.`);
      return;
    }

    const paymentIntent = readProviderObject(attributes.payment_intent);

    await this.prisma.$transaction(async (tx) => {
      await tx.subscriptionInvoice.upsert({
        where: {
          externalInvoiceId: invoiceId,
        },
        update: {
          externalPaymentIntentId:
            readProviderString(paymentIntent?.id) ??
            readProviderString(attributes.payment_intent_id),
          status: this.mapProviderInvoiceStatus(
            readProviderString(attributes.status),
            event.eventType,
          ),
          billingReason: readProviderString(attributes.billing_reason),
          currency: readProviderString(attributes.currency) ?? 'PHP',
          amountDueInCents: readProviderNumber(attributes.amount_due),
          amountPaidInCents: readProviderNumber(attributes.amount_paid),
          dueAt: readProviderUnixDate(attributes.due_at),
          paidAt: readProviderUnixDate(attributes.paid_at),
          finalizedAt: readProviderUnixDate(attributes.finalized_at),
          periodStartAt: readProviderUnixDate(attributes.period_start_at),
          periodEndAt: readProviderUnixDate(attributes.period_end_at),
          rawProviderPayload: event.payload as Prisma.InputJsonValue,
        },
        create: {
          companySubscriptionId: subscription.id,
          billingProvider: BillingProvider.PAYMONGO,
          externalInvoiceId: invoiceId,
          externalPaymentIntentId:
            readProviderString(paymentIntent?.id) ??
            readProviderString(attributes.payment_intent_id),
          status: this.mapProviderInvoiceStatus(
            readProviderString(attributes.status),
            event.eventType,
          ),
          billingReason: readProviderString(attributes.billing_reason),
          currency: readProviderString(attributes.currency) ?? 'PHP',
          amountDueInCents: readProviderNumber(attributes.amount_due),
          amountPaidInCents: readProviderNumber(attributes.amount_paid),
          dueAt: readProviderUnixDate(attributes.due_at),
          paidAt: readProviderUnixDate(attributes.paid_at),
          finalizedAt: readProviderUnixDate(attributes.finalized_at),
          periodStartAt: readProviderUnixDate(attributes.period_start_at),
          periodEndAt: readProviderUnixDate(attributes.period_end_at),
          rawProviderPayload: event.payload as Prisma.InputJsonValue,
        },
      });

      await tx.companySubscription.update({
        where: { id: subscription.id },
        data: {
          latestInvoiceExternalId: invoiceId,
          latestPaymentIntentId:
            readProviderString(paymentIntent?.id) ??
            readProviderString(attributes.payment_intent_id) ??
            subscription.latestPaymentIntentId,
          rawProviderPayload: event.payload as Prisma.InputJsonValue,
        },
      });
    });
  }

  private async processPaymentEvent(
    event: ReturnType<PaymongoWebhookService['extractEvent']>,
  ) {
    const attributes = event.resourceAttributes;
    const paymentIntentId = readProviderString(attributes.payment_intent_id);
    const description = readProviderString(attributes.description);
    const subscriptionIdFromDescription =
      description?.match(/subs_[A-Za-z0-9]+/)?.[0] ?? null;

    const subscription = paymentIntentId
      ? await this.prisma.companySubscription.findFirst({
          where: {
            latestPaymentIntentId: paymentIntentId,
          },
        })
      : subscriptionIdFromDescription
        ? await this.prisma.companySubscription.findUnique({
            where: {
              externalSubscriptionId: subscriptionIdFromDescription,
            },
          })
        : null;

    if (!subscription) {
      this.logger.warn(
        `Skipping ${event.eventType}: no local subscription matched the payment event.`,
      );
      return;
    }

    const nextStatus =
      event.eventType === 'payment.paid'
        ? SubscriptionStatus.ACTIVE
        : subscription.status === SubscriptionStatus.UNPAID
          ? SubscriptionStatus.UNPAID
          : SubscriptionStatus.PAST_DUE;

    await this.prisma.companySubscription.update({
      where: { id: subscription.id },
      data: {
        status: nextStatus,
        failureCode: readProviderString(attributes.failed_code),
        failureMessage: readProviderString(attributes.failed_message),
        rawProviderPayload: event.payload as Prisma.InputJsonValue,
      },
    });
  }

  private async processManualCheckoutPaidEvent(
    event: ReturnType<PaymongoWebhookService['extractEvent']>,
  ) {
    const attributes = event.resourceAttributes;
    const paymentAttempt = await this.findManualPaymentAttempt(event);

    if (!paymentAttempt) {
      this.logger.warn(
        `Skipping ${event.eventType}: no local manual payment attempt matched checkout session ${event.resourceId}.`,
      );
      return;
    }

    if (
      paymentAttempt.status === BillingPaymentAttemptStatus.PAID &&
      paymentAttempt.applicationStatus === BillingApplicationStatus.APPLIED
    ) {
      return;
    }

    const now = new Date();
    const payment = readFirstProviderArrayObject(attributes.payments);
    const paymentAttributes = readProviderObject(payment?.attributes);
    const paymentIntent = readProviderObject(attributes.payment_intent);
    const providerPaymentId =
      readProviderString(payment?.id) ??
      readProviderString(attributes.payment_id);
    const providerPaymentIntentId =
      readProviderString(paymentIntent?.id) ??
      readProviderString(attributes.payment_intent_id);

    await this.prisma.$transaction(async (tx) => {
      const paidAttemptForInvoice = await tx.billingPaymentAttempt.findFirst({
        where: {
          subscriptionInvoiceId: paymentAttempt.subscriptionInvoiceId,
          status: BillingPaymentAttemptStatus.PAID,
          id: {
            not: paymentAttempt.id,
          },
        },
        select: {
          id: true,
          externalPaymentId: true,
          externalPaymentIntentId: true,
        },
      });

      if (paidAttemptForInvoice) {
        const sameProviderPayment =
          (providerPaymentId &&
            paidAttemptForInvoice.externalPaymentId === providerPaymentId) ||
          (providerPaymentIntentId &&
            paidAttemptForInvoice.externalPaymentIntentId ===
              providerPaymentIntentId);

        if (!sameProviderPayment) {
          await tx.billingPaymentAttempt.update({
            where: { id: paymentAttempt.id },
            data: {
              applicationStatus: BillingApplicationStatus.FAILED,
              applicationError: `Invoice already has paid attempt ${paidAttemptForInvoice.id}; manual reconciliation required.`,
              rawProviderPayload: event.payload as Prisma.InputJsonValue,
            },
          });
          return;
        }
      }

      await tx.subscriptionInvoice.update({
        where: {
          id: paymentAttempt.subscriptionInvoiceId,
        },
        data: {
          status: SubscriptionInvoiceStatus.PAID,
          amountPaidInCents: paymentAttempt.amountInCents,
          paidAt: now,
          finalizedAt: now,
          externalPaymentIntentId: providerPaymentIntentId,
          rawProviderPayload: event.payload as Prisma.InputJsonValue,
        },
      });

      await tx.billingPaymentAttempt.update({
        where: {
          id: paymentAttempt.id,
        },
        data: {
          status: BillingPaymentAttemptStatus.PAID,
          applicationStatus:
            paymentAttempt.applicationStatus ===
            BillingApplicationStatus.APPLIED
              ? BillingApplicationStatus.APPLIED
              : BillingApplicationStatus.PENDING,
          externalPaymentIntentId: providerPaymentIntentId,
          externalPaymentId: providerPaymentId,
          paymentMethodType:
            readProviderString(attributes.payment_method_type) ??
            readProviderString(paymentAttributes?.payment_method_type),
          confirmedAt: now,
          failedAt: null,
          expiredAt: null,
          canceledAt: null,
          rawProviderPayload: event.payload as Prisma.InputJsonValue,
        },
      });
    });

    const applicationResult =
      await this.paymentApplicationService.applyPaidAttempt(paymentAttempt.id);

    if (!applicationResult.applied) {
      this.logger.warn(
        `Paid manual attempt ${paymentAttempt.id} was recorded but application is pending/failed: ${applicationResult.reason}.`,
      );
    }
  }

  private async processManualCheckoutTerminalEvent(
    event: ReturnType<PaymongoWebhookService['extractEvent']>,
  ) {
    const paymentAttempt = await this.findManualPaymentAttempt(event);

    if (!paymentAttempt) {
      this.logger.warn(
        `Skipping ${event.eventType}: no local manual payment attempt matched checkout session ${event.resourceId}.`,
      );
      return;
    }

    if (paymentAttempt.status === BillingPaymentAttemptStatus.PAID) {
      return;
    }

    const isExpired = event.eventType.includes('expired');
    const isCanceled =
      event.eventType.includes('cancelled') ||
      event.eventType.includes('canceled');

    await this.prisma.billingPaymentAttempt.update({
      where: {
        id: paymentAttempt.id,
      },
      data: {
        status: isExpired
          ? BillingPaymentAttemptStatus.EXPIRED
          : isCanceled
            ? BillingPaymentAttemptStatus.CANCELED
            : BillingPaymentAttemptStatus.FAILED,
        failedAt: isExpired ? null : new Date(),
        expiredAt: isExpired ? new Date() : null,
        canceledAt: isCanceled ? new Date() : null,
        rawProviderPayload: event.payload as Prisma.InputJsonValue,
      },
    });
  }

  private async findManualPaymentAttempt(
    event: ReturnType<PaymongoWebhookService['extractEvent']>,
  ) {
    const metadata = readProviderObject(event.resourceAttributes.metadata);
    const metadataPaymentAttemptId = this.readIntegerMetadata(
      metadata?.local_payment_attempt_id ?? metadata?.local_payment_request_id,
    );
    const filters = [
      event.resourceId
        ? {
            externalCheckoutSessionId: event.resourceId,
          }
        : undefined,
      metadataPaymentAttemptId
        ? {
            id: metadataPaymentAttemptId,
          }
        : undefined,
    ].filter(Boolean) as Prisma.BillingPaymentAttemptWhereInput[];

    if (filters.length === 0) {
      return null;
    }

    return this.prisma.billingPaymentAttempt.findFirst({
      where: {
        OR: filters,
      },
      include: {
        companySubscription: true,
        subscriptionPlanPrice: true,
      },
    });
  }

  private readIntegerMetadata(value: unknown) {
    if (typeof value === 'number' && Number.isInteger(value)) {
      return value;
    }

    if (typeof value === 'string' && /^\d+$/.test(value)) {
      return Number(value);
    }

    return null;
  }

  private verifySignature(
    rawPayload: string,
    signatureParts: { t: string; te: string; li: string },
    isLiveMode: boolean,
  ) {
    const timestamp = Number(signatureParts.t);

    if (!Number.isFinite(timestamp)) {
      throw new BadRequestException(
        'Invalid PayMongo webhook signature timestamp.',
      );
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.paymongoService.getWebhookSecret())
      .update(`${signatureParts.t}.${rawPayload}`)
      .digest('hex');

    const providedSignature = isLiveMode
      ? signatureParts.li
      : signatureParts.te;

    if (
      !providedSignature ||
      !this.timingSafeEqual(expectedSignature, providedSignature)
    ) {
      throw new BadRequestException('Invalid PayMongo webhook signature.');
    }

    const ageInSeconds = Math.abs(Date.now() - timestamp * 1000) / 1000;

    if (ageInSeconds > this.paymongoService.getWebhookToleranceInSeconds()) {
      throw new BadRequestException(
        'PayMongo webhook signature timestamp is outside the tolerance window.',
      );
    }
  }

  private parseSignature(signatureHeader: string) {
    const parts = Object.fromEntries(
      signatureHeader.split(',').map((part) => {
        const [key, value] = part.split('=');
        return [key?.trim(), value?.trim() ?? ''];
      }),
    );

    if (!parts.t || parts.te === undefined || parts.li === undefined) {
      throw new BadRequestException(
        'Invalid PayMongo signature header format.',
      );
    }

    if (!/^\d+$/.test(parts.t)) {
      throw new BadRequestException(
        'Invalid PayMongo signature header timestamp.',
      );
    }

    return {
      t: parts.t,
      te: parts.te,
      li: parts.li,
    };
  }

  private parsePayload(rawPayload: string): PaymongoWebhookEventEnvelope {
    try {
      return JSON.parse(rawPayload) as PaymongoWebhookEventEnvelope;
    } catch {
      throw new BadRequestException('Invalid PayMongo webhook payload.');
    }
  }

  private extractEvent(payload: PaymongoWebhookEventEnvelope) {
    const eventId = payload.data?.id;
    const eventType = payload.data?.attributes?.type;
    const isLiveMode = Boolean(payload.data?.attributes?.livemode);
    const resource = payload.data?.attributes?.data;

    if (!eventId || !eventType || !resource?.attributes) {
      throw new BadRequestException(
        'PayMongo webhook payload is missing required event data.',
      );
    }

    return {
      eventId,
      eventType,
      isLiveMode,
      resourceId: resource.id ?? null,
      resourceType: resource.type ?? null,
      resourceAttributes: resource.attributes,
      payload,
    };
  }

  private async markEventAttempt(webhookEventId: bigint) {
    return this.prisma.billingWebhookEvent.update({
      where: { id: webhookEventId },
      data: {
        processingAttempts: {
          increment: 1,
        },
        processingStatus: WebhookProcessingStatus.RECEIVED,
      },
    });
  }

  private mapProviderInvoiceStatus(
    providerStatus: string | null,
    eventType: string,
  ) {
    switch (providerStatus?.trim().toLowerCase()) {
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
    }

    if (eventType === 'subscription.invoice.paid') {
      return SubscriptionInvoiceStatus.PAID;
    }

    return SubscriptionInvoiceStatus.OPEN;
  }

  private timingSafeEqual(a: string, b: string) {
    const aBuffer = Buffer.from(a);
    const bBuffer = Buffer.from(b);

    if (aBuffer.length !== bBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(aBuffer, bBuffer);
  }
}
