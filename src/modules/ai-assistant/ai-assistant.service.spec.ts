import { ConfigService } from '@nestjs/config';
import { AiAssistantService } from './ai-assistant.service';
import type { UploadedAiAssistantAudioFile } from './types/uploaded-ai-assistant-audio-file.type';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';

describe('AiAssistantService', () => {
  const user = { id: 42 } as AuthUser;
  const createService = (apiKey?: string) =>
    new AiAssistantService({
      get: jest.fn().mockReturnValue(apiKey),
    } as unknown as ConfigService);

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses Gr8Books Neo in the local greeting', async () => {
    const response = await createService().chat({ message: 'hello' });

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

    const response = await createService('gemini-api-key').chat({
      message: 'who are you?',
    });

    expect(response).toEqual({
      message:
        "Hi there! I'm Neo AI, your in-app assistant for Gr8Books Neo. I can help you understand different modules and open specific pages for you to review.",
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
