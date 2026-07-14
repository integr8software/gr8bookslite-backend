import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const DEFAULT_API_BASE_URL = 'https://api.paymongo.com/v1';

export type PaymongoErrorContext = {
  status: number;
  errorCount: number;
  code: string | null;
  title: string | null;
  detail: string | null;
  source: string | null;
};

export class PaymongoRequestException extends BadGatewayException {
  constructor(
    message: string,
    readonly context: PaymongoErrorContext,
  ) {
    super(message);
  }
}

type PaymongoMetadata = Record<string, string | number | boolean | null>;

type PaymongoRequestBody = {
  data: {
    attributes: Record<string, unknown>;
  };
};

@Injectable()
export class PaymongoService {
  private readonly logger = new Logger(PaymongoService.name);

  constructor(private readonly configService: ConfigService) {}

  async createCustomer(input: {
    email: string;
    firstName: string;
    lastName: string;
    name?: string | null;
    phone?: string | null;
    metadata?: PaymongoMetadata;
  }) {
    const normalizedName =
      input.name?.trim() || `${input.firstName} ${input.lastName}`.trim();

    return this.request('POST', '/customers', {
      data: {
        attributes: {
          email: input.email,
          name: normalizedName,
          first_name: input.firstName,
          last_name: input.lastName,
          default_device: 'email',
          phone: input.phone ?? undefined,
          metadata: input.metadata,
        },
      },
    });
  }

  async createPlan(input: {
    name: string;
    description?: string | null;
    amountInCents: number;
    currency: string;
    interval: 'month' | 'year';
    intervalCount: number;
    trialDays: number;
    metadata?: PaymongoMetadata;
  }) {
    // PayMongo's subscriptions plan payload occasionally evolves.
    // Confirm the accepted attributes against test-mode responses if PayMongo changes the API.
    return this.request('POST', '/subscriptions/plans', {
      data: {
        attributes: {
          name: input.name,
          description: input.description ?? undefined,
          amount: input.amountInCents,
          currency: input.currency,
          interval: input.interval,
          interval_count: input.intervalCount,
          trial_period_days: input.trialDays,
          metadata: input.metadata,
        },
      },
    });
  }

  async createSubscription(input: {
    customerId: string;
    planId: string;
    metadata?: PaymongoMetadata;
  }) {
    // PayMongo's subscriptions API officially expects customer_id and plan_id.
    return this.request('POST', '/subscriptions', {
      data: {
        attributes: {
          customer_id: input.customerId,
          plan_id: input.planId,
          metadata: input.metadata,
        },
      },
    });
  }

  async createCheckoutSession(input: {
    amountInCents: number;
    currency: string;
    description: string;
    lineItemName: string;
    metadata?: PaymongoMetadata;
    referenceNumber: string;
    successUrl: string;
    cancelUrl: string;
  }) {
    return this.request('POST', '/checkout_sessions', {
      data: {
        attributes: {
          cancel_url: input.cancelUrl,
          description: input.description,
          line_items: [
            {
              amount: input.amountInCents,
              currency: input.currency,
              name: input.lineItemName,
              quantity: 1,
            },
          ],
          metadata: input.metadata,
          payment_method_types: [
            'card',
            'gcash',
            'paymaya',
            'qrph',
            'dob',
            'dob_ubp',
          ],
          reference_number: input.referenceNumber,
          send_email_receipt: true,
          show_description: true,
          show_line_items: true,
          success_url: input.successUrl,
        },
      },
    });
  }

  async retrieveSubscription(subscriptionId: string) {
    return this.request('GET', `/subscriptions/${subscriptionId}`);
  }

  async retrieveCustomerByEmail(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const payload = await this.request(
      'GET',
      `/customers?email=${encodeURIComponent(email)}`,
    );

    if (!payload) {
      return null;
    }

    const data = payload.data;

    if (Array.isArray(data)) {
      const customers = data as unknown[];
      const matchingCustomer = customers.find((entry) =>
        this.isCustomerEmailMatch(entry, normalizedEmail),
      );
      const firstCustomer =
        matchingCustomer ??
        customers.find(
          (entry) =>
            entry && typeof entry === 'object' && !Array.isArray(entry),
        );

      return (firstCustomer as Record<string, unknown> | undefined) ?? null;
    }

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return null;
    }

    if ('id' in data || this.isCustomerEmailMatch(data, normalizedEmail)) {
      return data as Record<string, unknown>;
    }

    const nestedData = (data as Record<string, unknown>).data;

    if (Array.isArray(nestedData)) {
      const customers = nestedData as unknown[];
      const matchingCustomer = customers.find((entry) =>
        this.isCustomerEmailMatch(entry, normalizedEmail),
      );

      return (matchingCustomer as Record<string, unknown> | undefined) ?? null;
    }

    return this.isCustomerEmailMatch(nestedData, normalizedEmail)
      ? (nestedData as Record<string, unknown>)
      : null;
  }

  async cancelSubscription(subscriptionId: string) {
    return this.request('POST', `/subscriptions/${subscriptionId}/cancel`);
  }

  async attachPaymentIntent(paymentIntentId: string, paymentMethodId: string) {
    return this.request('POST', `/payment_intents/${paymentIntentId}/attach`, {
      data: {
        attributes: {
          payment_method: paymentMethodId,
        },
      },
    });
  }

  getWebhookSecret(): string {
    const secret = this.configService.get<string>('PAYMONGO_WEBHOOK_SECRET');

    if (!secret) {
      throw new InternalServerErrorException(
        'PAYMONGO_WEBHOOK_SECRET is not configured.',
      );
    }

    return secret;
  }

  getWebhookToleranceInSeconds(): number {
    return Number(
      this.configService.get<string | number>(
        'PAYMONGO_WEBHOOK_TOLERANCE_SECONDS',
        300,
      ),
    );
  }

  private async request(
    method: 'GET' | 'POST',
    path: string,
    body?: PaymongoRequestBody,
  ) {
    const secretKey = this.configService.get<string>('PAYMONGO_SECRET_KEY');

    if (!secretKey) {
      throw new InternalServerErrorException(
        'PAYMONGO_SECRET_KEY is not configured.',
      );
    }

    const response = await fetch(`${this.getApiBaseUrl()}${path}`, {
      method,
      headers: {
        Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const payload = (await response.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;

    if (!response.ok) {
      const message =
        this.getErrorMessage(payload) ?? 'PayMongo request failed.';
      const errorContext = this.getErrorLogContext(response.status, payload);
      this.logger.warn(
        `${method} ${path} failed: ${message} | ${JSON.stringify(errorContext)}`,
      );
      throw new PaymongoRequestException(message, errorContext);
    }

    return payload;
  }

  private getApiBaseUrl(): string {
    return (
      this.configService.get<string>('PAYMONGO_API_BASE_URL') ??
      DEFAULT_API_BASE_URL
    ).replace(/\/$/, '');
  }

  private isCustomerEmailMatch(value: unknown, normalizedEmail: string) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return false;
    }

    const record = value as Record<string, unknown>;
    const attributes = record.attributes;
    const candidateEmail =
      typeof record.email === 'string'
        ? record.email
        : attributes &&
            typeof attributes === 'object' &&
            !Array.isArray(attributes) &&
            typeof (attributes as Record<string, unknown>).email === 'string'
          ? ((attributes as Record<string, unknown>).email as string)
          : null;

    return candidateEmail?.trim().toLowerCase() === normalizedEmail;
  }

  private getErrorMessage(payload: Record<string, unknown> | null) {
    const errors = payload?.errors;

    if (Array.isArray(errors) && errors.length > 0) {
      const firstError = errors[0] as {
        detail?: string;
        code?: string;
        source?: {
          pointer?: string;
          attribute?: string;
        };
      };

      const detail = firstError.detail ?? firstError.code ?? null;
      const pointer =
        firstError.source?.pointer ?? firstError.source?.attribute ?? null;

      if (!detail) {
        return null;
      }

      return pointer ? `${detail} (${pointer})` : detail;
    }

    return null;
  }

  private getErrorLogContext(
    status: number,
    payload: Record<string, unknown> | null,
  ): PaymongoErrorContext {
    const errors = Array.isArray(payload?.errors) ? payload.errors : [];
    const firstError =
      errors.length > 0
        ? (errors[0] as {
            code?: string;
            title?: string;
            detail?: string;
            source?: {
              pointer?: string;
              attribute?: string;
            };
          })
        : null;

    return {
      status,
      errorCount: errors.length,
      code: firstError?.code ?? null,
      title: firstError?.title ?? null,
      detail: firstError?.detail ?? null,
      source:
        firstError?.source?.pointer ?? firstError?.source?.attribute ?? null,
    };
  }
}
