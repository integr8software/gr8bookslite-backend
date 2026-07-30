import { SubscriptionStatus } from '@prisma/client';

export function mapProviderSubscriptionStatus(status: string) {
  switch (status) {
    case 'active':
      return SubscriptionStatus.ACTIVE;
    case 'past_due':
      return SubscriptionStatus.PAST_DUE;
    case 'unpaid':
      return SubscriptionStatus.UNPAID;
    case 'cancelled':
    case 'canceled':
      return SubscriptionStatus.CANCELED;
    case 'incomplete_cancelled':
      return SubscriptionStatus.INCOMPLETE_CANCELED;
    case 'trialing':
      return SubscriptionStatus.TRIALING;
    case 'expired':
      return SubscriptionStatus.EXPIRED;
    case 'incomplete':
    default:
      return SubscriptionStatus.INCOMPLETE;
  }
}

export function deriveSubscriptionStatusFromWebhookEvent(eventType: string) {
  switch (eventType) {
    case 'subscription.activated':
      return 'active';
    case 'subscription.past_due':
      return 'past_due';
    case 'subscription.unpaid':
      return 'unpaid';
    case 'subscription.updated':
      return 'cancelled';
    default:
      return 'incomplete';
  }
}
