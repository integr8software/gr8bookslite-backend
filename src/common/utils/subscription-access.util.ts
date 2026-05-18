import { SubscriptionStatus } from '@prisma/client';

type CompanySubscriptionAccessRecord = {
  status: SubscriptionStatus;
  trialEndsAt: Date | null;
  endsAt: Date | null;
  failureCode?: string | null;
};

type SubscriptionAccessOptions = {
  allowProviderActivationFallback?: boolean;
};

export function getSubscriptionAccessDenialReason(
  subscription: CompanySubscriptionAccessRecord,
  now = new Date(),
  options: SubscriptionAccessOptions = {},
): string | null {
  switch (subscription.status) {
    case SubscriptionStatus.ACTIVE:
      if (subscription.endsAt && subscription.endsAt.getTime() < now.getTime()) {
        return 'This company subscription has expired.';
      }

      return null;

    case SubscriptionStatus.TRIALING:
      if (
        subscription.trialEndsAt &&
        subscription.trialEndsAt.getTime() < now.getTime()
      ) {
        return 'This company trial has expired.';
      }

      return null;

    case SubscriptionStatus.PAST_DUE:
      return 'This company subscription is past due.';

    case SubscriptionStatus.INCOMPLETE:
      if (
        options.allowProviderActivationFallback &&
        subscription.failureCode === 'pending_provider_activation'
      ) {
        return null;
      }

      return 'This company subscription is awaiting initial payment.';

    case SubscriptionStatus.UNPAID:
      return 'This company subscription is unpaid.';

    case SubscriptionStatus.INCOMPLETE_CANCELED:
    case SubscriptionStatus.CANCELED:
    case SubscriptionStatus.EXPIRED:
      return 'This company subscription is no longer active.';

    default:
      return 'This company subscription is unavailable.';
  }
}
