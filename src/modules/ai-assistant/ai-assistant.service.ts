import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
  RequestTimeoutException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, Queue, Worker } from 'bullmq';
import type { JobsOptions, RedisOptions } from 'bullmq';
import { PermissionAction } from '../../common/enums/permission-action.enum';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { AiAssistantChatDto } from './dto/ai-assistant-chat.dto';
import { AiAssistantAction, AiAssistantChatResponse, GeminiGenerateContentResponse } from './ai-assistant.types';
import { AiModuleProfiles, findAiModuleProfile, getAiModulePromptProfiles } from './catalog/ai-module-profile.registry';
import { AiToolAuthorizerService } from './tools/ai-tool-authorizer.service';
import { AiToolExecutorService } from './tools/ai-tool-executor.service';
import type { UploadedAiAssistantAudioFile } from './types/uploaded-ai-assistant-audio-file.type';

const GEMINI_MODEL = 'gemini-2.5-flash';
const PRODUCT_NAME = 'Gr8Books Neo';
const SHORT_PRODUCT_NAME_PATTERN = /\bGr8Books\b(?!\s+Neo)/gi;
const PURCHASE_REQUEST_ADD_ROUTE = '/purchasing/purchase-request/add?assistant=1';
export const MAX_TRANSCRIPTION_AUDIO_SIZE_BYTES = 4 * 1024 * 1024;
const GEMINI_TRANSCRIPTION_TIMEOUT_MS = 90_000;
const MAX_CONCURRENT_TRANSCRIPTIONS = 4;
const VOICE_TRANSCRIPTION_QUEUE_NAME = 'neo-ai-voice-transcription';
const SUPPORTED_TRANSCRIPTION_AUDIO_TYPES = new Set([
  'audio/webm',
  'audio/ogg',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/aac',
]);

@Injectable()
export class AiAssistantService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AiAssistantService.name);
  private readonly transcriptionJobOptions: JobsOptions = {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 3000,
    },
    removeOnComplete: {
      age: 60 * 30,
      count: 1000,
    },
    removeOnFail: {
      age: 60 * 60,
      count: 1000,
    },
  };
  private activeTranscriptions = 0;
  private transcriptionQueue?: Queue<VoiceTranscriptionJobData>;
  private transcriptionWorker?: Worker<VoiceTranscriptionJobData>;

  constructor(
    private readonly configService: ConfigService,
    private readonly toolExecutor: AiToolExecutorService,
    private readonly toolAuthorizer: AiToolAuthorizerService,
  ) {}

  onModuleInit() {
    if (this.configService.get<string>('VOICE_TRANSCRIPTION_QUEUE_ENABLED') !== 'true') {
      this.logger.log('Voice transcription queue disabled; transcription will run inline.');
      return;
    }

    const connection = this.getRedisConnectionOptions();
    this.transcriptionQueue = new Queue<VoiceTranscriptionJobData>(VOICE_TRANSCRIPTION_QUEUE_NAME, {
      connection,
      defaultJobOptions: this.transcriptionJobOptions,
    });
    this.transcriptionWorker = new Worker<VoiceTranscriptionJobData>(VOICE_TRANSCRIPTION_QUEUE_NAME, (job) => this.processTranscriptionJob(job), {
      connection,
      concurrency: this.getVoiceTranscriptionWorkerConcurrency(),
    });

    this.transcriptionWorker.on('completed', (job) => {
      this.logger.debug(`Voice transcription job ${job.id} completed.`);
    });
    this.transcriptionWorker.on('failed', (job, error) => {
      this.logger.error(`Voice transcription job ${job?.id ?? 'unknown'} failed: ${error.message}`, error.stack);
    });

    this.logger.log('Voice transcription queue enabled with BullMQ.');
  }

  async onModuleDestroy() {
    await this.transcriptionWorker?.close();
    await this.transcriptionQueue?.close();
  }

  async chat(user: AuthUser, dto: AiAssistantChatDto): Promise<AiAssistantChatResponse> {
    const requestedModule = findAiModuleProfile(dto.message);

    if (requestedModule) {
      const authorization = this.toolAuthorizer.authorize(user, requestedModule.moduleCode, PermissionAction.VIEW);

      if (!authorization.allowed) {
        return {
          message: authorization.denialMessage ?? `You do not have permission to view ${requestedModule.name}.`,
          action: null,
        };
      }
    }

    if (this.isModuleListIntent(dto.message)) {
      return this.createModuleListResponse(user);
    }

    const apiKey = this.configService.get<string>('GEMINI_API_KEY')?.trim();

    if (!apiKey) {
      return this.createLocalDemoResponse(user, dto.message);
    }

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: this.createSystemPrompt(user) }],
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
      });

      if (!response.ok) {
        return this.createLocalDemoResponse(user, dto.message);
      }

      const payload = (await response.json()) as GeminiGenerateContentResponse;
      const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;

      return this.normalizeResponse(user, text);
    } catch {
      return this.createLocalDemoResponse(user, dto.message);
    }
  }

  async transcribe(user: AuthUser, file: UploadedAiAssistantAudioFile | undefined) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY')?.trim();

    if (!apiKey) {
      throw new BadRequestException('Neo AI voice transcription is not configured.');
    }

    this.validateTranscriptionAudio(file);

    if (this.transcriptionQueue) {
      const job = await this.transcriptionQueue.add('transcribe', {
        audio: {
          data: file.buffer.toString('base64'),
          mimetype: this.normalizeAudioMimeType(file.mimetype),
          originalname: file.originalname,
          size: file.size,
        },
        userId: user.id,
      });

      return {
        jobId: job.id,
        status: 'queued' as const,
      };
    }

    const transcript = await this.transcribeWithGemini(file);

    return {
      status: 'completed' as const,
      transcript,
    };
  }

  async getTranscriptionJob(user: AuthUser, jobId: string) {
    if (!this.transcriptionQueue) {
      throw new BadRequestException('Voice transcription queue is not enabled.');
    }

    const job = await this.transcriptionQueue.getJob(jobId);

    if (!job || job.data.userId !== user.id) {
      throw new NotFoundException('Voice transcription job was not found.');
    }

    const state = await job.getState();

    if (state === 'completed') {
      return {
        jobId,
        status: 'completed' as const,
        transcript: readTranscriptionJobReturnValue(job.returnvalue),
      };
    }

    if (state === 'failed') {
      return {
        error: job.failedReason || 'Neo AI could not transcribe that recording. Please try again.',
        jobId,
        status: 'failed' as const,
      };
    }

    return {
      jobId,
      status: state === 'active' ? ('processing' as const) : ('queued' as const),
    };
  }

  private async processTranscriptionJob(job: Job<VoiceTranscriptionJobData>) {
    const file: UploadedAiAssistantAudioFile = {
      buffer: Buffer.from(job.data.audio.data, 'base64'),
      mimetype: job.data.audio.mimetype,
      originalname: job.data.audio.originalname,
      size: job.data.audio.size,
    };

    return {
      transcript: await this.transcribeWithGemini(file),
    };
  }

  private async transcribeWithGemini(file: UploadedAiAssistantAudioFile) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY')?.trim();

    if (!apiKey) {
      throw new BadRequestException('Neo AI voice transcription is not configured.');
    }

    this.reserveTranscriptionSlot();

    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), GEMINI_TRANSCRIPTION_TIMEOUT_MS);

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: abortController.signal,
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: 'Transcribe this audio into plain text. Return only the transcript. If there is no clear speech, return an empty string.',
                },
                {
                  inlineData: {
                    mimeType: this.normalizeAudioMimeType(file.mimetype),
                    data: file.buffer.toString('base64'),
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0,
          },
        }),
      });

      if (!response.ok) {
        throw new BadRequestException('Neo AI could not transcribe that audio. Please try again.');
      }

      const payload = (await response.json()) as GeminiGenerateContentResponse;
      const transcript = payload.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';

      return transcript;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new RequestTimeoutException('Neo AI transcription took too long. Please try a shorter recording.');
      }

      throw new BadRequestException('Neo AI could not transcribe that audio. Please try again.');
    } finally {
      this.releaseTranscriptionSlot();
      clearTimeout(timeout);
    }
  }

  private createSystemPrompt(user: AuthUser) {
    const accessibleModuleCodes = this.toolAuthorizer.getAccessibleModuleCodes(user);

    return [
      `You are Neo AI, the ${PRODUCT_NAME} in-app assistant.`,
      'Speak naturally and conversationally, not like a scripted command response.',
      'Keep responses concise and easy to scan.',
      'Never put a long list into one paragraph. Group module lists by business area, place each area on its own line, and use line breaks between groups.',
      'Return plain text inside the JSON message. Do not return HTML, HTML entities, Markdown tables, or escaped spacing entities.',
      `Always refer to the product as "${PRODUCT_NAME}". Do not shorten it to "Gr8Books".`,
      'For now, focus on explaining modules, opening approved module pages, preparing Purchase Request drafts, and preparing Terms Maintenance previews for user review. Never submit, approve, delete, or save records.',
      `If the user asks you to introduce yourself, say: "Hi there! I'm Neo AI, your in-app assistant for ${PRODUCT_NAME}. I can help you understand different modules and open specific pages for you to review."`,
      'Return only JSON matching this TypeScript shape:',
      '{ "message": string, "action": null | { "type": "module_command", "moduleCode": string, "command": "open", "label"?: string } | { "type": "open_form", "target": "purchase_request", "route": "/purchasing/purchase-request/add?assistant=1", "label"?: string, "prefill"?: { "purchaseType"?: string, "supplierName"?: string, "department"?: string, "remarks"?: string, "items"?: [{ "description"?: string, "quantity"?: number, "uom"?: string, "cost"?: number }] } } | { "type": "terms_maintenance", "moduleCode": "TM", "command": "search" | "filter_status" | "prepare_add" | "preview_edit", "label"?: string, "query"?: string, "status"?: "Active" | "Inactive", "prefill"?: { "name"?: string, "description"?: string, "datemode"?: "Day" | "Month" | "Year", "period"?: string, "status"?: "Active" | "Inactive" }, "targetTermName"?: string } }',
      'Use module_command with the exact moduleCode to open any approved module. Never create or return a frontend route for module navigation.',
      'Use only the following modules and capabilities, which are already filtered for the current user:',
      JSON.stringify(getAiModulePromptProfiles(accessibleModuleCodes)),
      'If the user asks to open a module, include a module_command action with command "open".',
      'If the user asks to create or prepare a Purchase Request draft, extract item description, quantity, unit of measure, and unit price if present. Use an open_form action, do not save. Tell the user to review before saving.',
      'If the user asks about Terms Maintenance filtering, searching, adding, or editing, return a terms_maintenance action. For add or edit, prepare a preview only and explicitly tell the user to review before saving. Required add preview fields are name, datemode, period, and status. Negative or decimal periods are invalid. Period 0 means the term does not add time.',
      'If the user asks what a module is for or how it works, explain it clearly and return action null.',
    ].join('\n');
  }

  private normalizeResponse(user: AuthUser, text?: string): AiAssistantChatResponse {
    if (!text) {
      return {
        message: `I am Neo AI, your ${PRODUCT_NAME} assistant. I can guide you through modules, open approved pages, and prepare forms for your review. What would you like to do?`,
        action: null,
      };
    }

    try {
      const parsed = JSON.parse(text) as AiAssistantChatResponse;
      const actionResult = this.normalizeAction(user, parsed.action);

      return {
        message:
          actionResult.denialMessage ?? (typeof parsed.message === 'string' ? this.normalizeProductName(parsed.message) : 'I prepared the next step for you.'),
        action: actionResult.action,
      };
    } catch {
      return {
        message: this.normalizeProductName(text),
        action: null,
      };
    }
  }

  private validateTranscriptionAudio(file: UploadedAiAssistantAudioFile | undefined): asserts file is UploadedAiAssistantAudioFile {
    if (!file) {
      throw new BadRequestException('Audio recording is required.');
    }

    if (!file.buffer?.length) {
      throw new BadRequestException('Audio recording is empty.');
    }

    if (file.size > MAX_TRANSCRIPTION_AUDIO_SIZE_BYTES) {
      throw new BadRequestException('Audio recording is too large.');
    }

    if (!SUPPORTED_TRANSCRIPTION_AUDIO_TYPES.has(this.normalizeAudioMimeType(file.mimetype))) {
      throw new BadRequestException('Audio format is not supported.');
    }
  }

  private reserveTranscriptionSlot() {
    if (this.activeTranscriptions >= MAX_CONCURRENT_TRANSCRIPTIONS) {
      throw new HttpException('Neo AI voice transcription is busy. Please try again shortly.', HttpStatus.TOO_MANY_REQUESTS);
    }

    this.activeTranscriptions += 1;
  }

  private releaseTranscriptionSlot() {
    this.activeTranscriptions = Math.max(0, this.activeTranscriptions - 1);
  }

  private getRedisConnectionOptions(): RedisOptions {
    const redisUrl = this.configService.get<string>('REDIS_URL');

    if (redisUrl) {
      const parsedUrl = new URL(redisUrl);

      return {
        host: parsedUrl.hostname,
        port: Number(parsedUrl.port || 6379),
        username: parsedUrl.username ? decodeURIComponent(parsedUrl.username) : undefined,
        password: parsedUrl.password ? decodeURIComponent(parsedUrl.password) : undefined,
        db: parsedUrl.pathname ? Number(parsedUrl.pathname.replace('/', '') || 0) : undefined,
        tls: parsedUrl.protocol === 'rediss:' ? {} : undefined,
        maxRetriesPerRequest: null,
      };
    }

    return {
      host: this.configService.get<string>('REDIS_HOST', '127.0.0.1'),
      port: Number(this.configService.get<string | number>('REDIS_PORT', 6379)),
      username: this.configService.get<string>('REDIS_USERNAME') || undefined,
      password: this.configService.get<string>('REDIS_PASSWORD') || undefined,
      db: Number(this.configService.get<string | number>('REDIS_DB', 0)),
      maxRetriesPerRequest: null,
    };
  }

  private getVoiceTranscriptionWorkerConcurrency() {
    const concurrency = Number(this.configService.get<string | number>('VOICE_TRANSCRIPTION_QUEUE_CONCURRENCY', 4));

    return Number.isFinite(concurrency) && concurrency > 0 ? concurrency : 4;
  }

  private normalizeAudioMimeType(mimeType: string) {
    return mimeType.split(';')[0] || mimeType;
  }

  private normalizeProductName(message: string) {
    return message
      .replace(SHORT_PRODUCT_NAME_PATTERN, PRODUCT_NAME)
      .replace(/(?:&#x20;|&#32;|&nbsp;)/gi, ' ')
      .replace(/[ \t]+\n/g, '\n')
      .trim();
  }

  private normalizeAction(user: AuthUser, action: unknown): AiAssistantActionPermissionResult {
    if (!action || typeof action !== 'object') {
      return { action: null };
    }

    const candidate = action as Partial<AiAssistantAction>;

    if (candidate.type === 'module_command') {
      return this.toolExecutor.executeModuleCommand(user, candidate);
    }

    if (candidate.type === 'open_form' && candidate.target === 'purchase_request' && candidate.route === PURCHASE_REQUEST_ADD_ROUTE) {
      const authorization = this.toolAuthorizer.authorize(user, 'PR', PermissionAction.CREATE);

      if (!authorization.allowed) {
        return {
          action: null,
          denialMessage: authorization.denialMessage,
        };
      }

      return {
        action: {
          type: 'open_form',
          target: 'purchase_request',
          route: PURCHASE_REQUEST_ADD_ROUTE,
          label: candidate.label,
          prefill: candidate.prefill,
        },
      };
    }

    if (candidate.type === 'terms_maintenance' && candidate.moduleCode === 'TM' && this.isAllowedTermsMaintenanceCommand(candidate.command)) {
      const permissionDenialMessage = this.getTermsMaintenancePermissionDenialMessage(user, candidate.command);

      if (permissionDenialMessage) {
        return {
          action: null,
          denialMessage: permissionDenialMessage,
        };
      }

      return {
        action: {
          type: 'terms_maintenance',
          moduleCode: 'TM',
          command: candidate.command,
          label: candidate.label,
          query: typeof candidate.query === 'string' ? candidate.query : undefined,
          status: this.normalizeTermStatus(candidate.status),
          prefill: this.normalizeTermsMaintenancePrefill(candidate.prefill),
          targetTermName: typeof candidate.targetTermName === 'string' ? candidate.targetTermName : undefined,
        },
      };
    }

    return { action: null };
  }

  private createLocalDemoResponse(user: AuthUser, message: string): AiAssistantChatResponse {
    const normalized = message.toLowerCase();
    const purchaseRequestPrefill = this.createPurchaseRequestPrefill(message);

    if (purchaseRequestPrefill && this.isCreateIntent(normalized)) {
      const authorization = this.toolAuthorizer.authorize(user, 'PR', PermissionAction.CREATE);

      if (!authorization.allowed) {
        return {
          message: authorization.denialMessage ?? 'You do not have permission to add records in Purchase Request.',
          action: null,
        };
      }

      const item = purchaseRequestPrefill.items?.[0];
      const itemSummary = item?.description ? `${item.quantity ?? 1} ${item.description}` : 'your requested item';
      const priceSummary = item?.cost ? ` at PHP ${item.cost} per ${item.uom ?? 'qty'}` : '';

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

    const module = findAiModuleProfile(normalized);

    if (module && this.isOpenIntent(normalized)) {
      const actionResult = this.toolExecutor.executeModuleCommand(user, {
        type: 'module_command',
        moduleCode: module.moduleCode,
        command: 'open',
        label: module.name,
      });

      return {
        message: actionResult.denialMessage ?? `Okay, got it. Give me a moment, I will open ${module.name} for you.`,
        action: actionResult.action,
      };
    }

    if (this.isGreetingIntent(normalized)) {
      return {
        message: `Hello. I am Neo AI. I can explain ${PRODUCT_NAME} modules or open the right module page when you need it.`,
        action: null,
      };
    }

    if (module) {
      return {
        message: `${module.name}: ${module.summary} I can also open that module if you want.`,
        action: null,
      };
    }

    if (this.isIntroIntent(normalized)) {
      return {
        message: `I am Neo AI. I can explain ${PRODUCT_NAME} modules and open the right module page for you. For example, you can ask me to explain Purchase Request, open Charts of Accounts, or guide you to Sales Invoice.`,
        action: null,
      };
    }

    return {
      message: "Neo AI can't process that fully at the moment, but I can still help you find, understand, and open the modules available to you.",
      action: null,
    };
  }

  private isAllowedTermsMaintenanceCommand(command: unknown): command is Extract<AiAssistantAction, { type: 'terms_maintenance' }>['command'] {
    return command === 'open' || command === 'search' || command === 'filter_status' || command === 'prepare_add' || command === 'preview_edit';
  }

  private normalizeTermsMaintenancePrefill(prefill: unknown) {
    if (!prefill || typeof prefill !== 'object') {
      return undefined;
    }

    const candidate = prefill as Record<string, unknown>;

    return {
      name: typeof candidate.name === 'string' ? candidate.name : undefined,
      description: typeof candidate.description === 'string' ? candidate.description : undefined,
      datemode: this.normalizeTermDatemode(candidate.datemode),
      period: typeof candidate.period === 'string' ? candidate.period : undefined,
      status: this.normalizeTermStatus(candidate.status),
    };
  }

  private normalizeTermDatemode(value: unknown): 'Day' | 'Month' | 'Year' | undefined {
    return value === 'Day' || value === 'Month' || value === 'Year' ? value : undefined;
  }

  private normalizeTermStatus(value: unknown): 'Active' | 'Inactive' | undefined {
    return value === 'Active' || value === 'Inactive' ? value : undefined;
  }

  private getTermsMaintenancePermissionDenialMessage(user: AuthUser, command: Extract<AiAssistantAction, { type: 'terms_maintenance' }>['command']) {
    const viewAuthorization = this.toolAuthorizer.authorize(user, 'TM', PermissionAction.VIEW);

    if (!viewAuthorization.allowed) {
      return viewAuthorization.denialMessage ?? 'You do not have permission to view Terms Maintenance.';
    }

    if (command === 'prepare_add' && !this.toolAuthorizer.authorize(user, 'TM', PermissionAction.CREATE).allowed) {
      return 'You can view Terms Maintenance, but you do not have permission to add terms.';
    }

    if (command === 'preview_edit' && !this.toolAuthorizer.authorize(user, 'TM', PermissionAction.UPDATE).allowed) {
      return 'You can view Terms Maintenance, but you do not have permission to edit terms.';
    }

    return null;
  }

  private isOpenIntent(message: string) {
    return /\b(open|go to|goto|navigate|show|bring me|take me)\b/i.test(message);
  }

  private isModuleListIntent(message: string) {
    const normalized = message.toLowerCase();

    return (
      /\b(?:list|show)\b.*\bmodules?\b/.test(normalized) ||
      /\b(?:what|which)\b.*\bmodules?\b.*\b(?:know|support|available|access|help)\b/.test(normalized) ||
      /\b(?:available|accessible|supported)\s+modules?\b/.test(normalized)
    );
  }

  private createModuleListResponse(user: AuthUser): AiAssistantChatResponse {
    const accessibleModuleCodes = this.toolAuthorizer.getAccessibleModuleCodes(user);
    const modulesByArea = new Map<string, string[]>();

    for (const profile of AiModuleProfiles) {
      if (!accessibleModuleCodes.has(profile.moduleCode)) {
        continue;
      }

      const modules = modulesByArea.get(profile.area) ?? [];
      modules.push(profile.name);
      modulesByArea.set(profile.area, modules);
    }

    if (modulesByArea.size === 0) {
      return {
        message: 'No modules are currently available in your selected company and access context.',
        action: null,
      };
    }

    const groups = Array.from(modulesByArea, ([area, modules]) => `${area}:\n${modules.map((module) => `• ${module}`).join('\n')}`);

    return {
      message: `Here are the modules available to you, grouped by area:\n\n${groups.join('\n\n')}\n\nAsk me to explain or open any module.`,
      action: null,
    };
  }

  private isCreateIntent(message: string) {
    return /\b(create|prepare|make|draft|prefill|fill)\b/i.test(message);
  }

  private isIntroIntent(message: string) {
    return /\b(introduce|who are you|what can you do|your system|help)\b/i.test(message);
  }

  private isGreetingIntent(message: string) {
    return /^(hi|hello|hey|good morning|good afternoon|good evening)\b/i.test(message.trim());
  }

  private createPurchaseRequestPrefill(message: string) {
    const normalized = message.toLowerCase();

    if (!normalized.includes('purchase request')) {
      return null;
    }

    const quantityMatch = message.match(/\b(\d+(?:\.\d+)?)\s+([a-z][a-z0-9\s-]*?)(?=\s+(?:with|at|for|priced?|cost|amount|worth)\b|$)/i);

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
      message.match(/\b(?:price|priced|cost|amount)\s*(?:of|at|is|=|:)?\s*(?:php|pesos?|p|₱)?\s*(\d+(?:\.\d+)?)/i) ??
      message.match(/\b(?:php|pesos?|p|₱)\s*(\d+(?:\.\d+)?)/i) ??
      message.match(/\b(\d+(?:\.\d+)?)\s*(?:php|pesos?)\b/i);

    const cost = Number(priceMatch?.[1] ?? 0);

    return Number.isFinite(cost) ? cost : 0;
  }
}

type VoiceTranscriptionJobData = {
  audio: {
    data: string;
    mimetype: string;
    originalname: string;
    size: number;
  };
  userId: number;
};

type AiAssistantActionPermissionResult = {
  action: AiAssistantAction | null;
  denialMessage?: string;
};

function readTranscriptionJobReturnValue(value: unknown) {
  if (value && typeof value === 'object' && 'transcript' in value && typeof value.transcript === 'string') {
    return value.transcript;
  }

  return '';
}
