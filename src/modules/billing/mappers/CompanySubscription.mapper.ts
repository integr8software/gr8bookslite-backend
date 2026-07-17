import { getSubscriptionPlanPriceSummary } from '../../../common/utils/SubscriptionPlanPricing.util';
import { CompanySubscriptionDetails } from '../utils/BillingPrisma.util';

export function mapCompanySubscription(subscription: CompanySubscriptionDetails) {
  const priceSummary = getSubscriptionPlanPriceSummary(subscription.plan.prices);
  const modules = deriveSubscriptionPlanModules(subscription);

  return {
    id: subscription.id,
    status: subscription.status,
    billingCycle: subscription.billingCycle,
    billingProvider: subscription.billingProvider,
    billingMode: subscription.billingMode,
    autoRenew: subscription.autoRenew,
    startsAt: subscription.startsAt,
    trialEndsAt: subscription.trialEndsAt,
    currentPeriodStartAt: subscription.currentPeriodStartAt,
    nextBillingAt: subscription.nextBillingAt,
    endsAt: subscription.endsAt,
    canceledAt: subscription.canceledAt,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    failureCode: subscription.failureCode,
    failureMessage: subscription.failureMessage,
    providerReferences: {
      customerId: subscription.externalCustomerId,
      subscriptionId: subscription.externalSubscriptionId,
      planId: subscription.externalPlanId,
      paymentMethodId: subscription.externalPaymentMethodId,
      latestInvoiceId: subscription.latestInvoiceExternalId,
      latestPaymentIntentId: subscription.latestPaymentIntentId,
    },
    plan: {
      code: subscription.plan.code,
      name: subscription.plan.name,
      description: subscription.plan.description,
      currency: subscription.plan.currency,
      trialDays: subscription.plan.trialDays,
      monthlyPriceInCents: priceSummary.monthlyPriceInCents,
      yearlyPriceInCents: priceSummary.yearlyPriceInCents,
      selectedPrice: subscription.planPrice
        ? {
            id: subscription.planPrice.id,
            billingCycle: subscription.planPrice.billingCycle,
            intervalCount: subscription.planPrice.intervalCount,
            intervalUnit: subscription.planPrice.intervalUnit,
            priceInCents: subscription.planPrice.priceInCents,
            compareAtInCents: subscription.planPrice.compareAtInCents,
          }
        : null,
      prices: subscription.plan.prices.map((price) => ({
        id: price.id,
        billingCycle: price.billingCycle,
        intervalCount: price.intervalCount,
        intervalUnit: price.intervalUnit,
        priceInCents: price.priceInCents,
        compareAtInCents: price.compareAtInCents,
      })),
      usageRules: subscription.plan.usageRules.map((rule) => ({
        id: rule.id,
        metric: rule.metric,
        freeCount: rule.freeCount,
        unitPriceInCents: rule.unitPriceInCents,
      })),
      discountTiers: subscription.plan.discountTiers.map((tier) => ({
        id: tier.id,
        metric: tier.metric,
        thresholdCount: tier.thresholdCount,
        discountPercent: tier.discountPercent.toNumber(),
      })),
      moduleKeys: modules.map((module) => module.code),
      modules: modules.map((module) => ({
        id: module.id,
        moduleKey: module.code,
        name: module.name,
        isEnabled: true,
      })),
    },
    billingCustomer: subscription.billingCustomer
      ? {
          id: subscription.billingCustomer.id,
          email: subscription.billingCustomer.email,
          name: subscription.billingCustomer.name,
          phone: subscription.billingCustomer.phone,
          externalCustomerId: subscription.billingCustomer.externalCustomerId,
        }
      : null,
    paymentMethods: subscription.paymentMethods.map((paymentMethod) => ({
      id: paymentMethod.id,
      type: paymentMethod.type,
      brand: paymentMethod.brand,
      last4: paymentMethod.last4,
      expMonth: paymentMethod.expMonth,
      expYear: paymentMethod.expYear,
      isDefault: paymentMethod.isDefault,
      externalPaymentMethodId: paymentMethod.externalPaymentMethodId,
    })),
    invoices: subscription.invoices.map((invoice) => ({
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
    })),
  };
}

function deriveSubscriptionPlanModules(subscription: CompanySubscriptionDetails) {
  const modulesById = new Map<number, CompanySubscriptionDetails['plan']['systems'][number]['system']['modules'][number]['module']>();
  for (const planSystem of subscription.plan.systems) {
    if (!planSystem.isEnabled || !planSystem.system.isActive) continue;
    for (const systemModule of planSystem.system.modules) {
      modulesById.set(systemModule.module.id, systemModule.module);
    }
  }

  return [...modulesById.values()].sort((left, right) => left.name.localeCompare(right.name) || left.code.localeCompare(right.code));
}
