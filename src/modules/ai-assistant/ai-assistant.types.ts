export type AiAssistantAction =
  | {
      type: 'navigate';
      route: string;
      label?: string;
    }
  | {
      type: 'open_form';
      target: 'purchase_request';
      route: string;
      label?: string;
      prefill?: {
        purchaseType?: string;
        supplierName?: string;
        department?: string;
        remarks?: string;
        items?: Array<{
          description?: string;
          quantity?: number;
          uom?: string;
          cost?: number;
        }>;
      };
    };

export type AiAssistantChatResponse = {
  message: string;
  action: AiAssistantAction | null;
};

export type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};
