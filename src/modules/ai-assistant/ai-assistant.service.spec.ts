import { ConfigService } from '@nestjs/config';
import { AiAssistantService } from './ai-assistant.service';

describe('AiAssistantService', () => {
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
});
