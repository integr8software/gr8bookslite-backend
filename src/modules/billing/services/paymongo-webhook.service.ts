import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import {
  BillingProvider,
  BillingWebhookEvent,
  Prisma,
  SubscriptionStatus,
  WebhookProcessingStatus,
} from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../../../prisma/prisma.service';
import { PaymongoWebhookEventEnvelope } from '../types/paymongo-webhook-event.type';
import {
  readProviderNumber,
  readProviderObject,
  readProviderString,
  readProviderUnixDate,
} from '../utils/ProviderPayload.util';
import {
  deriveSubscriptionStatusFromWebhookEvent,
  mapInvoiceStatusFromWebhookEvent,
  mapProviderSubscriptionStatus,
} from '../utils/SubscriptionStatus.util';
import { PaymongoService } from './paymongo.service';

@Injectable()
export class PaymongoWebhookService {
  private readonly logger = new Logger(PaymongoWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymongoService: PaymongoService,
  ) {}

  async handleWebhook(rawBody: Buffer | string | undefined, signatureHeader: string | undefined) {
    if (!rawBody || !signatureHeader) {
      throw new BadRequestException('Missing webhook body or Paymongo-Signature header.');
    }

    const rawPayload = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : rawBody;
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
      const message = error instanceof Error ? error.message : 'Webhook processing failed.';

      await this.prisma.billingWebhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          processingStatus: WebhookProcessingStatus.FAILED,
          lastError: message,
        },
      });

      this.logger.error(`Failed to process webhook ${event.eventType} (${event.eventId}): ${message}`);
      throw new InternalServerErrorException('Webhook processing failed.');
    }
  }

  private async processEvent(
    webhookEvent: BillingWebhookEvent,
    event: ReturnType<PaymongoWebhookService['extractEvent']>,
  ) {
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
      default:
        this.logger.log(`Unhandled PayMongo webhook event received: ${event.eventType}`);
        break;
    }

    await this.prisma.billingWebhookEvent.update({
      where: { id: webhookEvent.id },
      data: {
        processingStatus: WebhookProcessingStatus.PROCESSED,
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
      this.logger.warn(`Skipping ${event.eventType}: local subscription not found for ${subscriptionId}.`);
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
        startsAt: readProviderUnixDate(attributes.created_at) ?? subscription.startsAt,
        canceledAt:
          readProviderUnixDate(attributes.cancelled_at) ?? subscription.canceledAt,
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
      this.logger.warn(`Skipping ${event.eventType}: local subscription not found for ${subscriptionId}.`);
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
          status:
            readProviderString(attributes.status) ??
            mapInvoiceStatusFromWebhookEvent(event.eventType),
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
          status:
            readProviderString(attributes.status) ??
            mapInvoiceStatusFromWebhookEvent(event.eventType),
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
    const subscriptionIdFromDescription = description?.match(/subs_[A-Za-z0-9]+/)?.[0] ?? null;

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
      this.logger.warn(`Skipping ${event.eventType}: no local subscription matched the payment event.`);
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

  private verifySignature(
    rawPayload: string,
    signatureParts: { t: string; te: string; li: string },
    isLiveMode: boolean,
  ) {
    const timestamp = Number(signatureParts.t);

    if (!Number.isFinite(timestamp)) {
      throw new BadRequestException('Invalid PayMongo webhook signature timestamp.');
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.paymongoService.getWebhookSecret())
      .update(`${signatureParts.t}.${rawPayload}`)
      .digest('hex');

    const providedSignature = isLiveMode ? signatureParts.li : signatureParts.te;

    if (!providedSignature || !this.timingSafeEqual(expectedSignature, providedSignature)) {
      throw new BadRequestException('Invalid PayMongo webhook signature.');
    }

    const ageInSeconds = Math.abs(Date.now() - timestamp * 1000) / 1000;

    if (ageInSeconds > this.paymongoService.getWebhookToleranceInSeconds()) {
      throw new BadRequestException('PayMongo webhook signature timestamp is outside the tolerance window.');
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
      throw new BadRequestException('Invalid PayMongo signature header format.');
    }

    if (!/^\d+$/.test(parts.t)) {
      throw new BadRequestException('Invalid PayMongo signature header timestamp.');
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
      throw new BadRequestException('PayMongo webhook payload is missing required event data.');
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
        processingStatus: WebhookProcessingStatus.PENDING,
      },
    });
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
