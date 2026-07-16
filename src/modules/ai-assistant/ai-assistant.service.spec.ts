import { ConfigService } from '@nestjs/config';
import { AiAssistantService } from './ai-assistant.service';
import type { UploadedAiAssistantAudioFile } from './types/uploaded-ai-assistant-audio-file.type';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';

describe('AiAssistantService', () => {
  const user = {
    id: 42,
    companyId: 1,
    permissions: ['TM:view', 'TM:create', 'TM:update'],
  } as AuthUser;
  const createService = (apiKey?: string) =>
    new AiAssistantService({
      get: jest.fn().mockReturnValue(apiKey),
    } as unknown as ConfigService);

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses Gr8Books Neo in the local greeting', async () => {
    const response = await createService().chat(user, { message: 'hello' });

    expect(response).toEqual({
      message:
        'Hello. I am Neo AI. I can explain Gr8Books Neo modules or open the right module page when you need it.',
      action: null,
    });
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

  it('normalizes generated Term Management actions', async () => {
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
                      type: 'term_management',
                      moduleCode: 'TM',
                      command: 'filter_status',
                      label: 'Term Management',
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
        type: 'term_management',
        moduleCode: 'TM',
        command: 'filter_status',
        label: 'Term Management',
        status: 'Inactive',
      },
    });
  });

  it('blocks generated Term Management actions when the user lacks permission', async () => {
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
                      type: 'term_management',
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
      message:
        'You can view Term Management, but you do not have permission to edit terms.',
      action: null,
    });
  });

  it('rejects oversized voice transcription audio', async () => {
    const file = createAudioFile({
      size: 4 * 1024 * 1024 + 1,
    });

    await expect(
      createService('gemini-api-key').transcribe(user, file),
    ).rejects.toThrow('Audio recording is too large.');
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
    const requests = Array.from({ length: 4 }, () =>
      service.transcribe(user, createAudioFile()),
    );

    await expect(service.transcribe(user, createAudioFile())).rejects.toThrow(
      'Neo AI voice transcription is busy. Please try again shortly.',
    );

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

function createAudioFile(
  overrides: Partial<UploadedAiAssistantAudioFile> = {},
): UploadedAiAssistantAudioFile {
  const buffer = Buffer.from('audio');

  return {
    buffer,
    mimetype: 'audio/webm',
    originalname: 'recording.webm',
    size: buffer.length,
    ...overrides,
  };
}
