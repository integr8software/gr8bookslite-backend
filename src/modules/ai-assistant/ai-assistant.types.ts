export type AiAssistantAction =
  | {
      type: 'module_command';
      moduleCode: string;
      command: 'open';
      label?: string;
    }
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
    }
  | {
      type: 'terms_maintenance';
      moduleCode: 'TM';
      command: 'open' | 'search' | 'filter_status' | 'prepare_add' | 'preview_edit';
      label?: string;
      query?: string;
      status?: 'Active' | 'Inactive';
      prefill?: {
        name?: string;
        description?: string;
        datemode?: 'Day' | 'Month' | 'Year';
        period?: string;
        status?: 'Active' | 'Inactive';
      };
      targetTermName?: string;
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
