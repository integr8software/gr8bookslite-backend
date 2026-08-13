import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CompanyCurrencyService } from './company-currency.service';

@Module({
  imports: [PrismaModule],
  providers: [CompanyCurrencyService],
  exports: [CompanyCurrencyService],
})
export class CompanyCurrencyModule {}
