import { ConfigService } from '@nestjs/config';
import { AiAssistantService } from './ai-assistant.service';
import type { UploadedAiAssistantAudioFile } from './types/uploaded-ai-assistant-audio-file.type';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import type { AccessControlService } from '../../common/access/access-control.service';
import { AiToolAuthorizerService } from './tools/ai-tool-authorizer.service';
import { AiToolExecutorService } from './tools/ai-tool-executor.service';
import { AiToolRegistry } from './tools/ai-tool.registry';

describe('AiAssistantService', () => {
  const user = {
    id: 42,
    companyId: 1,
    enabledModules: ['APV', 'BBU', 'DVMR', 'FA', 'PR', 'SI', 'TM'],
    permissions: ['APV:view', 'BBU:view', 'DVMR:view', 'FA:view', 'PR:view', 'PR:create', 'SI:view', 'TM:view', 'TM:create', 'TM:update'],
  } as AuthUser;
  const createService = (apiKey?: string) => {
    const accessControlService = {
      hasPermission: jest.fn((currentUser: AuthUser, moduleCode: string, action: string) => currentUser.permissions.includes(`${moduleCode}:${action}`)),
    } as unknown as AccessControlService;
    const authorizer = new AiToolAuthorizerService(accessControlService);
    const executor = new AiToolExecutorService(new AiToolRegistry(), authorizer);

    return new AiAssistantService(
      {
        get: jest.fn().mockReturnValue(apiKey),
      } as unknown as ConfigService,
      executor,
      authorizer,
    );
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses Gr8Books Neo in the local greeting', async () => {
    const response = await createService().chat(user, { message: 'hello' });

    expect(response).toEqual({
      message: 'Hello. I am Neo AI. I can explain Gr8Books Neo modules or open the right module page when you need it.',
      action: null,
    });
  });

  it('groups the accessible module list by business area', async () => {
    const response = await createService().chat(user, { message: 'what modules do you know?' });

    expect(response.action).toBeNull();
    expect(response.message).toContain('Here are the modules available to you, grouped by area:');
    expect(response.message).toContain('Financial Maintenance:\n• Terms Maintenance');
    expect(response.message).toContain('Delivery Vehicle Management:\n• Vehicle Repair and Maintenance');
    expect(response.message).toContain('Accounts Payable:\n• Accounts Payable Voucher');
    expect(response.message).toContain('Sales:\n• Sales Invoice');
    expect(response.message).toContain('Purchasing:\n• Purchase Request');
    expect(response.message).toContain('Others:\n• Fixed Asset\n• Beginning Balance Uploader');
    expect(response.message.indexOf('Purchasing:')).toBeLessThan(response.message.indexOf('Others:'));
    expect(response.message).not.toContain('Dashboard');
  });

  it('normalizes generated responses that shorten the product name', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    message:
                      "Hi there! I'm Neo AI, your in-app assistant for Gr8Books. I can help you understand different modules and open specific pages for you to review.",
                    action: null,
                  }),
                },
              ],
            },
          },
        ],
      }),
    } as unknown as Response);

    const response = await createService('gemini-api-key').chat(user, {
      message: 'who are you?',
    });

    expect(response).toEqual({
      message:
        "Hi there! I'm Neo AI, your in-app assistant for Gr8Books Neo. I can help you understand different modules and open specific pages for you to review.",
      action: null,
    });
  });

  it('removes spacing entities from generated messages', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    message: 'I can help with Sales Invoice. &#x20;',
                    action: null,
                  }),
                },
              ],
            },
          },
        ],
      }),
    } as unknown as Response);

    const response = await createService('gemini-api-key').chat(user, {
      message: 'tell me about sales invoice',
    });

    expect(response).toEqual({
      message: 'I can help with Sales Invoice.',
      action: null,
    });
  });

  it('normalizes generated Terms Maintenance actions', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    message: 'Showing inactive terms.',
                    action: {
                      type: 'terms_maintenance',
                      moduleCode: 'TM',
                      command: 'filter_status',
                      label: 'Terms Maintenance',
                      status: 'Inactive',
                    },
                  }),
                },
              ],
            },
          },
        ],
      }),
    } as unknown as Response);

    const response = await createService('gemini-api-key').chat(user, {
      message: 'show inactive terms',
    });

    expect(response).toEqual({
      message: 'Showing inactive terms.',
      action: {
        type: 'terms_maintenance',
        moduleCode: 'TM',
        command: 'filter_status',
        label: 'Terms Maintenance',
        status: 'Inactive',
      },
    });
  });

  it('opens any accessible module by module code without a backend-owned route', async () => {
    const response = await createService().chat(user, { message: 'open accounts payable voucher' });

    expect(response).toEqual({
      message: 'Okay, got it. Give me a moment, I will open Accounts Payable Voucher for you.',
      action: {
        type: 'module_command',
        moduleCode: 'APV',
        command: 'open',
        label: 'Accounts Payable Voucher',
      },
    });
  });

  it('explains modules outside the original hard-coded guide', async () => {
    const response = await createService().chat(user, { message: 'what is vehicle repair and maintenance?' });

    expect(response).toEqual({
      message:
        'Vehicle Repair and Maintenance: Tracks vehicle inspections, defects, maintenance requests, repairs, and service history. I can also open that module if you want.',
      action: null,
    });
  });

  it('blocks module information and navigation when view access is missing', async () => {
    const response = await createService().chat(
      {
        ...user,
        enabledModules: ['PR'],
        permissions: ['PR:view'],
      },
      { message: 'open sales invoice' },
    );

    expect(response).toEqual({
      message: 'Sales Invoice is not enabled for the selected company.',
      action: null,
    });
  });

  it('blocks modules that are enabled but not permitted for the user', async () => {
    const response = await createService().chat(
      {
        ...user,
        enabledModules: ['SI'],
        permissions: [],
      },
      { message: 'explain sales invoice' },
    );

    expect(response).toEqual({
      message: 'You do not have permission to view Sales Invoice.',
      action: null,
    });
  });

  it('normalizes generated module commands through the registered tool executor', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    message: 'Opening Sales Invoice.',
                    action: {
                      type: 'module_command',
                      moduleCode: 'SI',
                      command: 'open',
                    },
                  }),
                },
              ],
            },
          },
        ],
      }),
    } as unknown as Response);

    const response = await createService('gemini-api-key').chat(user, {
      message: 'open sales invoice',
    });

    expect(response).toEqual({
      message: 'Opening Sales Invoice.',
      action: {
        type: 'module_command',
        moduleCode: 'SI',
        command: 'open',
        label: 'Sales Invoice',
      },
    });
  });

  it('blocks generated Terms Maintenance actions when the user lacks permission', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    message: 'Preparing a term edit preview.',
                    action: {
                      type: 'terms_maintenance',
                      moduleCode: 'TM',
                      command: 'preview_edit',
                      targetTermName: 'Net 30',
                    },
                  }),
                },
              ],
            },
          },
        ],
      }),
    } as unknown as Response);

    const response = await createService('gemini-api-key').chat(
      {
        ...user,
        permissions: ['TM:view'],
      },
      {
        message: 'edit Net 30',
      },
    );

    expect(response).toEqual({
      message: 'You can view Terms Maintenance, but you do not have permission to edit terms.',
      action: null,
    });
  });

  it('rejects oversized voice transcription audio', async () => {
    const file = createAudioFile({
      size: 4 * 1024 * 1024 + 1,
    });

    await expect(createService('gemini-api-key').transcribe(user, file)).rejects.toThrow('Audio recording is too large.');
  });

  it('limits concurrent voice transcriptions', async () => {
    const resolveFetches: Array<(value: Response) => void> = [];
    jest.spyOn(globalThis, 'fetch').mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetches.push(resolve);
        }),
    );

    const service = createService('gemini-api-key');
    const requests = Array.from({ length: 4 }, () => service.transcribe(user, createAudioFile()));

    await expect(service.transcribe(user, createAudioFile())).rejects.toThrow('Neo AI voice transcription is busy. Please try again shortly.');

    const response = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        candidates: [
          {
            content: {
              parts: [{ text: 'hello' }],
            },
          },
        ],
      }),
    } as unknown as Response;

    resolveFetches.forEach((resolveFetch) => {
      resolveFetch(response);
    });

    await expect(Promise.all(requests)).resolves.toEqual(
      Array.from({ length: 4 }, () => ({
        status: 'completed',
        transcript: 'hello',
      })),
    );
  });
});

function createAudioFile(overrides: Partial<UploadedAiAssistantAudioFile> = {}): UploadedAiAssistantAudioFile {
  const buffer = Buffer.from('audio');

  return {
    buffer,
    mimetype: 'audio/webm',
    originalname: 'recording.webm',
    size: buffer.length,
    ...overrides,
  };
}
