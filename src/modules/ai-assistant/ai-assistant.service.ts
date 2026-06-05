import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiAssistantChatDto } from './dto/ai-assistant-chat.dto';
import {
  AiAssistantAction,
  AiAssistantChatResponse,
  GeminiGenerateContentResponse,
} from './ai-assistant.types';

const GEMINI_MODEL = 'gemini-2.5-flash';
const PURCHASE_REQUEST_ADD_ROUTE =
  '/purchasing/purchase-request/add?assistant=1';

const moduleGuide = [
  {
    label: 'Purchasing > Purchase Request',
    route: '/purchasing/purchase-request',
    aliases: ['purchase request', 'pr', 'purchasing request'],
    actions: ['navigate', 'explain'],
    notes:
      'Use Purchase Request to start a controlled request for goods or services before procurement continues to canvass, purchase order, and receiving.',
  },
  {
    label: 'Purchasing > Canvass Form',
    route: '/purchasing/canvass-form',
    aliases: ['canvass', 'canvass form', 'quotation comparison'],
    actions: ['navigate', 'explain'],
    notes:
      'Use Canvass Form when comparing supplier quotations before choosing where to buy.',
  },
  {
    label: 'Inventory > Material Request',
    route: '/inventory/material-request',
    aliases: ['material request', 'inventory request'],
    actions: ['navigate', 'explain'],
    notes:
      'Use Material Request when a department needs items from inventory stock.',
  },
  {
    label: 'Accounts Payable > Accounts Payable Voucher',
    route: '/accounts-payable/accounts-payable-voucher',
    aliases: ['accounts payable voucher', 'ap voucher', 'payables voucher'],
    actions: ['navigate', 'explain'],
    notes:
      'Use Accounts Payable Voucher to record and track supplier obligations before payment.',
  },
  {
    label: 'Sales > Sales Invoice',
    route: '/sales/sales-invoice',
    aliases: ['sales invoice', 'customer invoice'],
    actions: ['navigate', 'explain'],
    notes:
      'Use Sales Invoice to bill customers for delivered goods or completed services.',
  },
  {
    label: 'Maintenance > Financial Management > Charts of Accounts',
    route: '/maintenance/financial-management/charts-of-accounts',
    aliases: [
      'chart of accounts',
      'charts of accounts',
      'coa',
      'accounts list',
    ],
    actions: ['navigate', 'explain'],
    notes:
      'Use Charts of Accounts to maintain the account codes and names used for posting accounting entries.',
  },
];

@Injectable()
export class AiAssistantService {
  constructor(private readonly configService: ConfigService) {}

  async chat(dto: AiAssistantChatDto): Promise<AiAssistantChatResponse> {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY')?.trim();

    if (!apiKey) {
      return this.createLocalDemoResponse(dto.message);
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: this.createSystemPrompt() }],
            },
            contents: [
              ...(dto.history ?? []).slice(-6).map((message) => ({
                role: message.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: message.content }],
              })),
              {
                role: 'user',
                parts: [
                  {
                    text: JSON.stringify({
                      message: dto.message,
                      currentPath: dto.currentPath ?? '',
                    }),
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.35,
              responseMimeType: 'application/json',
            },
          }),
        },
      );

      if (!response.ok) {
        return this.createLocalDemoResponse(dto.message);
      }

      const payload = (await response.json()) as GeminiGenerateContentResponse;
      const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;

      return this.normalizeResponse(text);
    } catch {
      return this.createLocalDemoResponse(dto.message);
    }
  }

  private createSystemPrompt() {
    return [
      'You are Neo AI, the Gr8BooksLite in-app assistant.',
      'Speak naturally and conversationally, not like a scripted command response.',
      'For now, focus on explaining modules, opening approved module pages, and preparing Purchase Request drafts for user review. Never submit, approve, delete, or save records.',
      'If the user asks you to introduce yourself, say that you are Neo AI and briefly explain that you can guide users through modules and open pages for review.',
      'Return only JSON matching this TypeScript shape:',
      '{ "message": string, "action": null | { "type": "navigate", "route": string, "label"?: string } | { "type": "open_form", "target": "purchase_request", "route": "/purchasing/purchase-request/add?assistant=1", "label"?: string, "prefill"?: { "purchaseType"?: string, "supplierName"?: string, "department"?: string, "remarks"?: string, "items"?: [{ "description"?: string, "quantity"?: number, "uom"?: string, "cost"?: number }] } } }',
      'Only use routes from this module guide:',
      JSON.stringify(moduleGuide),
      'If the user asks to open a module, respond like: "Okay, got it. Give me a moment, I will open Purchase Request for you." and include a navigate action.',
      'If the user asks to create or prepare a Purchase Request draft, extract item description, quantity, unit of measure, and unit price if present. Use an open_form action, do not save. Tell the user to review before saving.',
      'If the user asks what a module is for or how it works, explain it clearly and return action null.',
    ].join('\n');
  }

  private normalizeResponse(text?: string): AiAssistantChatResponse {
    if (!text) {
      return {
        message:
          'I am Neo AI, your Gr8BooksLite assistant. I can guide you through modules, open approved pages, and prepare forms for your review. What would you like to do?',
        action: null,
      };
    }

    try {
      const parsed = JSON.parse(text) as AiAssistantChatResponse;
      return {
        message:
          typeof parsed.message === 'string'
            ? parsed.message
            : 'I prepared the next step for you.',
        action: this.normalizeAction(parsed.action),
      };
    } catch {
      return {
        message: text,
        action: null,
      };
    }
  }

  private normalizeAction(action: unknown): AiAssistantAction | null {
    if (!action || typeof action !== 'object') {
      return null;
    }

    const candidate = action as Partial<AiAssistantAction>;

    if (
      candidate.type === 'navigate' &&
      typeof candidate.route === 'string' &&
      this.isAllowedRoute(candidate.route)
    ) {
      return {
        type: 'navigate',
        route: candidate.route,
        label: candidate.label,
      };
    }

    if (
      candidate.type === 'open_form' &&
      candidate.target === 'purchase_request' &&
      candidate.route === PURCHASE_REQUEST_ADD_ROUTE
    ) {
      return {
        type: 'open_form',
        target: 'purchase_request',
        route: PURCHASE_REQUEST_ADD_ROUTE,
        label: candidate.label,
        prefill: candidate.prefill,
      };
    }

    return null;
  }

  private isAllowedRoute(route?: string) {
    return moduleGuide.some((module) => module.route === route);
  }

  private createLocalDemoResponse(message: string): AiAssistantChatResponse {
    const normalized = message.toLowerCase();
    const purchaseRequestPrefill = this.createPurchaseRequestPrefill(message);

    if (purchaseRequestPrefill && this.isCreateIntent(normalized)) {
      const item = purchaseRequestPrefill.items?.[0];
      const itemSummary = item?.description
        ? `${item.quantity ?? 1} ${item.description}`
        : 'your requested item';
      const priceSummary = item?.cost
        ? ` at PHP ${item.cost} per ${item.uom ?? 'qty'}`
        : '';

      return {
        message: `Okay, I will prepare a Purchase Request draft for ${itemSummary}${priceSummary}. Please review it before saving.`,
        action: {
          type: 'open_form',
          target: 'purchase_request',
          route: PURCHASE_REQUEST_ADD_ROUTE,
          label: 'Purchase Request',
          prefill: purchaseRequestPrefill,
        },
      };
    }

    const module = this.findModule(normalized);

    if (module && this.isOpenIntent(normalized)) {
      return {
        message: `Okay, got it. Give me a moment, I will open ${this.getModuleShortName(
          module.label,
        )} for you.`,
        action: {
          type: 'navigate',
          route: module.route,
          label: this.getModuleShortName(module.label),
        },
      };
    }

    if (this.isGreetingIntent(normalized)) {
      return {
        message:
          'Hello. I am Neo AI. I can explain Gr8BooksLite modules or open the right module page when you need it.',
        action: null,
      };
    }

    if (module) {
      return {
        message: `${this.getModuleShortName(module.label)} is for ${module.notes
          .charAt(0)
          .toLowerCase()}${module.notes.slice(
          1,
        )} I can also open that module if you want.`,
        action: null,
      };
    }

    if (this.isIntroIntent(normalized)) {
      return {
        message:
          'I am Neo AI. I can explain Gr8BooksLite modules and open the right module page for you. For example, you can ask me to explain Purchase Request, open Charts of Accounts, or guide you to Sales Invoice.',
        action: null,
      };
    }

    return {
      message:
        "Neo AI can't process that fully at the moment, but I can still help you find and understand modules. Try asking me to open or explain Purchase Request, Charts of Accounts, Material Request, AP Voucher, or Sales Invoice.",
      action: null,
    };
  }

  private findModule(message: string) {
    return moduleGuide.find((module) =>
      [module.label.toLowerCase(), ...module.aliases].some((alias) =>
        message.includes(alias),
      ),
    );
  }

  private isOpenIntent(message: string) {
    return /\b(open|go to|goto|navigate|show|bring me|take me)\b/i.test(
      message,
    );
  }

  private isCreateIntent(message: string) {
    return /\b(create|prepare|make|draft|prefill|fill)\b/i.test(message);
  }

  private isIntroIntent(message: string) {
    return /\b(introduce|who are you|what can you do|your system|help)\b/i.test(
      message,
    );
  }

  private isGreetingIntent(message: string) {
    return /^(hi|hello|hey|good morning|good afternoon|good evening)\b/i.test(
      message.trim(),
    );
  }

  private getModuleShortName(label: string) {
    return label.split('>').at(-1)?.trim() ?? label;
  }

  private createPurchaseRequestPrefill(message: string) {
    const normalized = message.toLowerCase();

    if (!normalized.includes('purchase request')) {
      return null;
    }

    const quantityMatch = message.match(
      /\b(\d+(?:\.\d+)?)\s+([a-z][a-z0-9\s-]*?)(?=\s+(?:with|at|for|priced?|cost|amount|worth)\b|$)/i,
    );

    if (!quantityMatch) {
      return null;
    }

    const quantity = Number(quantityMatch[1]);
    const description = quantityMatch[2]
      ?.replace(/\b(?:pcs?|pieces?|qty|quantity|of|the)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const cost = this.extractUnitCost(message);

    if (!Number.isFinite(quantity) || !description) {
      return null;
    }

    return {
      purchaseType: 'Goods',
      remarks: 'Prepared by Neo AI. Please review before saving.',
      items: [
        {
          description,
          quantity,
          uom: 'PC',
          cost,
        },
      ],
    };
  }

  private extractUnitCost(message: string) {
    const priceMatch =
      message.match(
        /\b(?:price|priced|cost|amount)\s*(?:of|at|is|=|:)?\s*(?:php|pesos?|p|₱)?\s*(\d+(?:\.\d+)?)/i,
      ) ??
      message.match(/\b(?:php|pesos?|p|₱)\s*(\d+(?:\.\d+)?)/i) ??
      message.match(/\b(\d+(?:\.\d+)?)\s*(?:php|pesos?)\b/i);

    const cost = Number(priceMatch?.[1] ?? 0);

    return Number.isFinite(cost) ? cost : 0;
  }
}
