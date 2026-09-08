import {
  BillingApplicationStatus,
  BillingMode,
  BillingPaymentAttemptStatus,
  BillingPaymentPurpose,
  CompanyStatus,
  SubscriptionInvoiceStatus,
  SubscriptionStatus,
} from '@prisma/client';
import { BillingPaymentApplicationService } from './billing-payment-application.service';

type AttemptRecord = Record<string, unknown>;

describe('BillingPaymentApplicationService', () => {
  const defaultInvoice = {
    id: 10,
    status: SubscriptionInvoiceStatus.PAID,
    totalAmountInCents: 50000,
    amountPaidInCents: 50000,
    currency: 'PHP',
    description: 'Pro Plan Monthly',
    periodStartAt: new Date('2026-09-01T00:00:00.000Z'),
    periodEndAt: new Date('2026-10-01T00:00:00.000Z'),
  };

  const defaultAttempt = {
    id: 1,
    companyId: 100,
    companySubscriptionId: 200,
    status: BillingPaymentAttemptStatus.PAID,
    applicationStatus: BillingApplicationStatus.PENDING,
    purpose: BillingPaymentPurpose.ONBOARDING,
    amountInCents: 50000,
    currency: 'PHP',
    externalCheckoutSessionId: 'cs_test_123',
    externalPaymentIntentId: 'pi_test_123',
    subscriptionInvoice: { ...defaultInvoice },
    companySubscription: {
      id: 200,
      latestPaymentIntentId: 'pi_existing_999',
    },
    subscriptionPlanPrice: {
      intervalCount: 1,
      intervalUnit: 'MONTH' as const,
    },
  };

  function createService(
    overrides: {
      attempt?: AttemptRecord | null;
      txAttempt?: AttemptRecord;
      transactionError?: Error;
    } = {},
  ) {
    const attempt = overrides.attempt !== undefined ? overrides.attempt : { ...defaultAttempt };
    const txAttempt = overrides.txAttempt !== undefined ? overrides.txAttempt : { ...attempt };

    const txMock = {
      billingPaymentAttempt: {
        findUniqueOrThrow: jest.fn().mockResolvedValue(txAttempt),
        update: jest.fn().mockResolvedValue(txAttempt),
      },
      companySubscription: {
        update: jest.fn().mockResolvedValue({}),
      },
      userOnboardingDraft: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      company: {
        update: jest.fn().mockResolvedValue({}),
      },
    };

    const prismaMock = {
      billingPaymentAttempt: {
        findUnique: jest.fn().mockResolvedValue(attempt),
        update: jest.fn().mockResolvedValue(attempt),
      },
      $transaction: jest.fn().mockImplementation((callback: (tx: typeof txMock) => Promise<unknown>) => {
        if (overrides.transactionError) {
          return Promise.reject(overrides.transactionError);
        }
        return callback(txMock);
      }),
    };

    const service = new BillingPaymentApplicationService(prismaMock as never);

    return { service, prisma: prismaMock, tx: txMock };
  }

  describe('Preconditions and early validation', () => {
    it('returns applied: false when payment attempt is not found', async () => {
      const { service, prisma } = createService({ attempt: null });

      const result = await service.applyPaidAttempt(999);

      expect(result).toEqual({ applied: false, reason: 'payment_attempt_not_found' });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('returns applied: true when payment attempt was already applied', async () => {
      const { service, prisma } = createService({
        attempt: { ...defaultAttempt, applicationStatus: BillingApplicationStatus.APPLIED },
      });

      const result = await service.applyPaidAttempt(1);

      expect(result).toEqual({ applied: true, reason: 'already_applied' });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('returns applied: false when attempt status is not PAID', async () => {
      const { service, prisma } = createService({
        attempt: { ...defaultAttempt, status: BillingPaymentAttemptStatus.PENDING },
      });

      const result = await service.applyPaidAttempt(1);

      expect(result).toEqual({ applied: false, reason: 'payment_not_confirmed' });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('returns applied: false when subscription invoice status is not PAID', async () => {
      const { service, prisma } = createService({
        attempt: {
          ...defaultAttempt,
          subscriptionInvoice: { ...defaultInvoice, status: SubscriptionInvoiceStatus.OPEN },
        },
      });

      const result = await service.applyPaidAttempt(1);

      expect(result).toEqual({ applied: false, reason: 'invoice_not_paid' });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('marks application failed and returns mismatch when amounts do not match', async () => {
      const { service, prisma } = createService({
        attempt: {
          ...defaultAttempt,
          amountInCents: 50000,
          subscriptionInvoice: { ...defaultInvoice, totalAmountInCents: 60000, amountPaidInCents: 60000 },
        },
      });

      const result = await service.applyPaidAttempt(1);

      expect(result).toEqual({ applied: false, reason: 'amount_or_currency_mismatch' });
      expect(prisma.billingPaymentAttempt.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          applicationStatus: BillingApplicationStatus.FAILED,
          applicationError: 'Paid attempt amount or currency does not match its invoice.',
        }) as unknown,
      });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('marks application failed and returns mismatch when currencies do not match', async () => {
      const { service, prisma } = createService({
        attempt: {
          ...defaultAttempt,
          currency: 'PHP',
          subscriptionInvoice: { ...defaultInvoice, currency: 'USD' },
        },
      });

      const result = await service.applyPaidAttempt(1);

      expect(result).toEqual({ applied: false, reason: 'amount_or_currency_mismatch' });
      expect(prisma.billingPaymentAttempt.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          applicationStatus: BillingApplicationStatus.FAILED,
          applicationError: 'Paid attempt amount or currency does not match its invoice.',
        }) as unknown,
      });
    });
  });

  describe('Trial payment handling during onboarding', () => {
    it('sets subscription status to TRIALING and trialEndsAt when invoice description contains "trial"', async () => {
      const trialAttempt = {
        ...defaultAttempt,
        purpose: BillingPaymentPurpose.ONBOARDING,
        subscriptionInvoice: {
          ...defaultInvoice,
          description: '14-Day Trial Starter Plan',
          periodEndAt: new Date('2026-09-15T00:00:00.000Z'),
        },
      };

      const { service, tx } = createService({ attempt: trialAttempt, txAttempt: trialAttempt });

      const result = await service.applyPaidAttempt(1);

      expect(result).toEqual({ applied: true, reason: 'applied' });
      expect(tx.companySubscription.update).toHaveBeenCalledWith({
        where: { id: trialAttempt.companySubscriptionId },
        data: expect.objectContaining({
          status: SubscriptionStatus.TRIALING,
          billingMode: BillingMode.MANUAL,
          autoRenew: false,
          trialEndsAt: trialAttempt.subscriptionInvoice.periodEndAt,
          endsAt: trialAttempt.subscriptionInvoice.periodEndAt,
          nextBillingAt: trialAttempt.subscriptionInvoice.periodEndAt,
        }) as unknown,
      });

      expect(tx.userOnboardingDraft.updateMany).toHaveBeenCalledWith({
        where: { provisionedCompanyId: trialAttempt.companyId },
        data: expect.objectContaining({
          paymentMethodReference: 'cs_test_123',
        }) as unknown,
      });

      expect(tx.billingPaymentAttempt.update).toHaveBeenCalledWith({
        where: { id: trialAttempt.id },
        data: expect.objectContaining({
          applicationStatus: BillingApplicationStatus.APPLIED,
          applicationError: null,
        }) as unknown,
      });
    });

    it('sets subscription status to ACTIVE and trialEndsAt to null when not a trial', async () => {
      const activeAttempt = {
        ...defaultAttempt,
        purpose: BillingPaymentPurpose.ONBOARDING,
        subscriptionInvoice: {
          ...defaultInvoice,
          description: 'Standard Paid Plan',
          periodEndAt: new Date('2026-10-01T00:00:00.000Z'),
        },
      };

      const { service, tx } = createService({ attempt: activeAttempt, txAttempt: activeAttempt });

      const result = await service.applyPaidAttempt(1);

      expect(result).toEqual({ applied: true, reason: 'applied' });
      expect(tx.companySubscription.update).toHaveBeenCalledWith({
        where: { id: activeAttempt.companySubscriptionId },
        data: expect.objectContaining({
          status: SubscriptionStatus.ACTIVE,
          trialEndsAt: null,
        }) as unknown,
      });
    });

    it('does not treat non-onboarding payments as trial even if invoice mentions trial', async () => {
      const nonOnboardingAttempt = {
        ...defaultAttempt,
        purpose: BillingPaymentPurpose.RENEWAL,
        companyId: 100,
        subscriptionInvoice: {
          ...defaultInvoice,
          description: 'Renewal after trial',
        },
      };

      const { service, tx } = createService({
        attempt: nonOnboardingAttempt,
        txAttempt: nonOnboardingAttempt,
      });

      const result = await service.applyPaidAttempt(1);

      expect(result).toEqual({ applied: true, reason: 'applied' });
      expect(tx.companySubscription.update).toHaveBeenCalledWith({
        where: { id: nonOnboardingAttempt.companySubscriptionId },
        data: expect.objectContaining({
          status: SubscriptionStatus.ACTIVE,
          trialEndsAt: null,
        }) as unknown,
      });
      expect(tx.company.update).toHaveBeenCalledWith({
        where: { id: nonOnboardingAttempt.companyId },
        data: {
          status: CompanyStatus.ACTIVE,
          isActive: true,
        },
      });
    });
  });

  describe('Additional company and other payment purposes', () => {
    it('skips company update when purpose is ADDITIONAL_COMPANY and companySubscriptionId is absent', async () => {
      const additionalCompanyAttempt = {
        ...defaultAttempt,
        purpose: BillingPaymentPurpose.ADDITIONAL_COMPANY,
        companySubscriptionId: null,
        companyId: null,
      };

      const { service, tx } = createService({
        attempt: additionalCompanyAttempt,
        txAttempt: additionalCompanyAttempt,
      });

      const result = await service.applyPaidAttempt(1);

      expect(result).toEqual({ applied: true, reason: 'applied' });
      expect(tx.companySubscription.update).not.toHaveBeenCalled();
      expect(tx.company.update).not.toHaveBeenCalled();
    });
  });

  describe('Billing period calculation fallbacks', () => {
    it('computes periodEnd using addBillingInterval when invoice periodEndAt is null', async () => {
      const startAt = new Date('2026-01-01T00:00:00.000Z');
      const attemptNoEnd = {
        ...defaultAttempt,
        subscriptionInvoice: {
          ...defaultInvoice,
          periodStartAt: startAt,
          periodEndAt: null,
        },
        subscriptionPlanPrice: {
          intervalCount: 1,
          intervalUnit: 'MONTH' as const,
        },
      };

      const { service, tx } = createService({ attempt: attemptNoEnd, txAttempt: attemptNoEnd });

      await service.applyPaidAttempt(1);

      expect(tx.companySubscription.update).toHaveBeenCalledWith({
        where: { id: attemptNoEnd.companySubscriptionId },
        data: expect.objectContaining({
          currentPeriodStartAt: startAt,
          nextBillingAt: new Date('2026-02-01T00:00:00.000Z'),
          endsAt: new Date('2026-02-01T00:00:00.000Z'),
        }) as unknown,
      });
    });
  });

  describe('Transaction failures and concurrency guards', () => {
    it('returns early without error if lockedAttempt was applied concurrently', async () => {
      const concurrentAttempt = {
        ...defaultAttempt,
        applicationStatus: BillingApplicationStatus.PENDING,
      };
      const lockedAttempt = {
        ...defaultAttempt,
        applicationStatus: BillingApplicationStatus.APPLIED,
      };

      const { service, tx } = createService({
        attempt: concurrentAttempt,
        txAttempt: lockedAttempt,
      });

      const result = await service.applyPaidAttempt(1);

      expect(result).toEqual({ applied: true, reason: 'applied' });
      expect(tx.companySubscription.update).not.toHaveBeenCalled();
      expect(tx.billingPaymentAttempt.update).not.toHaveBeenCalled();
    });

    it('marks attempt as failed and returns application_failed when transaction throws', async () => {
      const { service, prisma } = createService({
        transactionError: new Error('Database transaction timeout'),
      });

      const result = await service.applyPaidAttempt(1);

      expect(result).toEqual({ applied: false, reason: 'application_failed' });
      expect(prisma.billingPaymentAttempt.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          applicationStatus: BillingApplicationStatus.FAILED,
          applicationError: 'Database transaction timeout',
        }) as unknown,
      });
    });
  });
});
