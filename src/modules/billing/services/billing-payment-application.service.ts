import { Injectable, Logger } from '@nestjs/common';
import {
  BillingApplicationStatus,
  BillingMode,
  BillingPaymentAttemptStatus,
  BillingPaymentPurpose,
  CompanyStatus,
  SubscriptionInvoiceStatus,
  SubscriptionStatus,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class BillingPaymentApplicationService {
  private readonly logger = new Logger(BillingPaymentApplicationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async applyPaidAttempt(attemptId: number) {
    const attempt = await this.prisma.billingPaymentAttempt.findUnique({
      where: { id: attemptId },
      include: {
        subscriptionInvoice: true,
        companySubscription: true,
        subscriptionPlanPrice: true,
      },
    });

    if (!attempt) {
      return {
        applied: false,
        reason: 'payment_attempt_not_found',
      };
    }

    if (attempt.applicationStatus === BillingApplicationStatus.APPLIED) {
      return {
        applied: true,
        reason: 'already_applied',
      };
    }

    if (attempt.status !== BillingPaymentAttemptStatus.PAID) {
      return {
        applied: false,
        reason: 'payment_not_confirmed',
      };
    }

    if (attempt.subscriptionInvoice.status !== SubscriptionInvoiceStatus.PAID) {
      return {
        applied: false,
        reason: 'invoice_not_paid',
      };
    }

    if (
      (attempt.subscriptionInvoice.totalAmountInCents ?? attempt.subscriptionInvoice.amountPaidInCents) !== attempt.amountInCents ||
      attempt.subscriptionInvoice.currency !== attempt.currency
    ) {
      await this.markApplicationFailed(attempt.id, 'Paid attempt amount or currency does not match its invoice.');
      return {
        applied: false,
        reason: 'amount_or_currency_mismatch',
      };
    }

    await this.prisma.billingPaymentAttempt.update({
      where: { id: attempt.id },
      data: {
        applicationStatus: BillingApplicationStatus.PROCESSING,
        applicationAttempts: { increment: 1 },
        lastApplicationAttemptAt: new Date(),
        applicationError: null,
      },
    });

    try {
      await this.prisma.$transaction(async (tx) => {
        const lockedAttempt = await tx.billingPaymentAttempt.findUniqueOrThrow({
          where: { id: attempt.id },
          include: {
            subscriptionInvoice: true,
            companySubscription: true,
            subscriptionPlanPrice: true,
          },
        });

        if (lockedAttempt.applicationStatus === BillingApplicationStatus.APPLIED) {
          return;
        }

        if (lockedAttempt.status !== BillingPaymentAttemptStatus.PAID) {
          throw new Error('Payment attempt is no longer paid.');
        }

        if (lockedAttempt.subscriptionInvoice.status !== SubscriptionInvoiceStatus.PAID) {
          throw new Error('Subscription invoice is no longer paid.');
        }

        const periodStart = lockedAttempt.subscriptionInvoice.periodStartAt ?? new Date();
        const periodEnd =
          lockedAttempt.subscriptionInvoice.periodEndAt ??
          this.addBillingInterval(periodStart, {
            intervalCount: lockedAttempt.subscriptionPlanPrice?.intervalCount ?? 1,
            intervalUnit: lockedAttempt.subscriptionPlanPrice?.intervalUnit ?? 'MONTH',
          });

        if (lockedAttempt.companySubscriptionId) {
          await tx.companySubscription.update({
            where: {
              id: lockedAttempt.companySubscriptionId,
            },
            data: {
              status: SubscriptionStatus.ACTIVE,
              billingMode: BillingMode.MANUAL,
              autoRenew: false,
              currentPeriodStartAt: periodStart,
              nextBillingAt: periodEnd,
              endsAt: periodEnd,
              trialEndsAt: null,
              externalPaymentMethodId: null,
              latestPaymentIntentId: lockedAttempt.externalPaymentIntentId ?? lockedAttempt.companySubscription?.latestPaymentIntentId,
            },
          });
        }

        if (lockedAttempt.purpose === BillingPaymentPurpose.ONBOARDING) {
          await tx.userOnboardingDraft.updateMany({
            where: {
              provisionedCompanyId: lockedAttempt.companyId,
            },
            data: {
              billingCompletedAt: new Date(),
              paymentMethodReference: lockedAttempt.externalCheckoutSessionId ?? lockedAttempt.externalPaymentIntentId,
            },
          });
        } else {
          await tx.company.update({
            where: {
              id: lockedAttempt.companyId,
            },
            data: {
              status: CompanyStatus.ACTIVE,
              isActive: true,
            },
          });
        }

        await tx.billingPaymentAttempt.update({
          where: { id: lockedAttempt.id },
          data: {
            applicationStatus: BillingApplicationStatus.APPLIED,
            appliedAt: new Date(),
            applicationError: null,
          },
        });
      });

      return {
        applied: true,
        reason: 'applied',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Payment application failed.';
      await this.markApplicationFailed(attempt.id, message);
      this.logger.error(`Failed to apply paid billing attempt ${attempt.id}: ${message}`);
      return {
        applied: false,
        reason: 'application_failed',
      };
    }
  }

  private async markApplicationFailed(attemptId: number, message: string) {
    await this.prisma.billingPaymentAttempt.update({
      where: { id: attemptId },
      data: {
        applicationStatus: BillingApplicationStatus.FAILED,
        applicationError: message,
        lastApplicationAttemptAt: new Date(),
      },
    });
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
}
