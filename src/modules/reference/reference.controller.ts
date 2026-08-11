import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { ReferenceService } from './reference.service';

@Public()
@SkipThrottle()
@Controller({ path: 'reference', version: '1' })
export class ReferenceController {
  constructor(private readonly referenceService: ReferenceService) {}

  @Get('countries')
  listCountries() {
    return this.referenceService.listCountries();
  }

  @Get('currencies')
  listCurrencies() {
    return this.referenceService.listCurrencies();
  }
}
