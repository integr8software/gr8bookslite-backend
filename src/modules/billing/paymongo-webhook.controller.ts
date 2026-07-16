import { Controller, Headers, HttpCode, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { PaymongoWebhookService } from './services/paymongo-webhook.service';

@Public()
@Controller({
  path: 'webhooks/paymongo',
  version: '1',
})
export class PaymongoWebhookController {
  constructor(private readonly paymongoWebhookService: PaymongoWebhookService) {}

  @Post()
  @HttpCode(200)
  async ingestWebhook(@Req() request: Request & { rawBody?: Buffer }, @Headers('paymongo-signature') signatureHeader: string | undefined) {
    const result = await this.paymongoWebhookService.handleWebhook(request.rawBody, signatureHeader);

    return {
      message: 'SUCCESS',
      ...result,
    };
  }
}
