import { Module } from '@nestjs/common';
import { AlphanumericTaxCodesController } from './alphanumeric-tax-codes.controller';
import { AlphanumericTaxCodesService } from './alphanumeric-tax-codes.service';

@Module({
  controllers: [AlphanumericTaxCodesController],
  providers: [AlphanumericTaxCodesService],
})
export class AlphanumericTaxCodesModule {}
