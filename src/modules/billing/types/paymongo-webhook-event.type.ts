export type PaymongoWebhookEventEnvelope = {
  data?: {
    id?: string;
    type?: string;
    attributes?: {
      type?: string;
      livemode?: boolean;
      data?: {
        id?: string;
        type?: string;
        attributes?: Record<string, unknown>;
      };
      previous_data?: Record<string, unknown>;
      created_at?: number;
      updated_at?: number;
    };
  };
};
