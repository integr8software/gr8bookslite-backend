import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';

@Public()
@Controller({
  path: 'health',
  version: '1',
})
export class HealthController {
  @Get()
  getHealth() {
    return {
      status: 'ok',
    };
  }
}
