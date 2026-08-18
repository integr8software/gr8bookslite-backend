import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { BillingCycle, BillingPaymentPurpose, SubscriptionPlanScope } from '@prisma/client';
import { AppRole } from '../../common/enums/app-role.enum';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { BillingService } from './billing.service';

describe('BillingService', () => {
  function createService(prismaOverrides: Record<string, unknown> = {}) {
    const prisma = {
      subscriptionPlan: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      ...prismaOverrides,
    };
    const cacheManager = {
      wrap: jest.fn(async (_key: string, factory: () => Promise<unknown>) => factory()),
    };
    const service = new BillingService(prisma as never, {} as never, {} as never, {} as never, cacheManager as never);

    return { cacheManager, prisma, service };
  }

  it('normalizes a plan scope before querying and caches by normalized scope', async () => {
    const { cacheManager, prisma, service } = createService();

    await expect(service.listPlans(' onboarding ')).resolves.toEqual({ plans: [] });

    expect(cacheManager.wrap).toHaveBeenCalledWith('billing:plans:ONBOARDING', expect.any(Function), 10 * 60 * 1000);
    expect(prisma.subscriptionPlan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isActive: true, scope: SubscriptionPlanScope.ONBOARDING } }),
    );
  });

  it('rejects an unsupported plan scope before accessing the database', async () => {
    const { prisma, service } = createService();

    await expect(service.listPlans('unsupported')).rejects.toThrow(new BadRequestException('Selected plan scope is invalid.'));
    expect(prisma.subscriptionPlan.findMany).not.toHaveBeenCalled();
  });

  it('requires company context and admin membership when subscribing', async () => {
    const { service } = createService();
    const prepareCompanySubscription = jest.spyOn(service, 'prepareCompanySubscription');
    const user = { id: 4, role: AppRole.USER, companyId: 12, membershipRole: 'USER' } as AuthUser;

    await expect(service.subscribeCompany(user, { planCode: 'PRO', billingCycle: BillingCycle.MONTHLY })).rejects.toThrow(ForbiddenException);
    expect(prepareCompanySubscription).not.toHaveBeenCalled();
  });

  it('passes the active company and selected plan to subscription preparation for an admin', async () => {
    const { service } = createService();
    const prepareCompanySubscription = jest.spyOn(service, 'prepareCompanySubscription').mockResolvedValue({} as never);
    const user = { id: 4, role: AppRole.USER, companyId: 12, membershipRole: 'ADMIN' } as AuthUser;

    await service.subscribeCompany(user, { planCode: ' pro ', billingCycle: BillingCycle.YEARLY });

    expect(prepareCompanySubscription).toHaveBeenCalledWith({
      companyId: 12,
      ownerUserId: 4,
      planCode: ' pro ',
      billingCycle: BillingCycle.YEARLY,
    });
  });

  it('matches manual payment purposes to their plan scopes', () => {
    const { service } = createService();
    const assertPurposeMatchesScope = (purpose: BillingPaymentPurpose, scope: SubscriptionPlanScope) =>
      service['assertManualPurposeMatchesPlanScope'](purpose, scope);

    expect(() => assertPurposeMatchesScope(BillingPaymentPurpose.ONBOARDING, SubscriptionPlanScope.ADDITIONAL_COMPANY)).toThrow(
      new BadRequestException('Selected plan is not available for onboarding.'),
    );
    expect(() => assertPurposeMatchesScope(BillingPaymentPurpose.ADDITIONAL_COMPANY, SubscriptionPlanScope.ONBOARDING)).toThrow(
      new BadRequestException('Selected plan is not available for additional companies.'),
    );
    expect(() => assertPurposeMatchesScope(BillingPaymentPurpose.ONBOARDING, SubscriptionPlanScope.ONBOARDING)).not.toThrow();
  });
});
