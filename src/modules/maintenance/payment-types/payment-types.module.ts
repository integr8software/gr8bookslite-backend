import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { PaymentTypesController } from './payment-types.controller';
import { PaymentTypesService } from './payment-types.service';

@Module({
  imports: [PrismaModule, AccessControlModule, AuthModule],
  controllers: [PaymentTypesController],
  providers: [PaymentTypesService],
  exports: [PaymentTypesService],
})
export class PaymentTypesModule {}
