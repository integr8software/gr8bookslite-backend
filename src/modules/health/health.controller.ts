import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';

@Public()
@SkipThrottle()
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
