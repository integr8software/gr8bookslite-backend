import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { PurchaseOrderController } from './purchase-order.controller';
import { PurchaseOrderService } from './purchase-order.service';
@Module({ imports: [PrismaModule, AccessControlModule, AuthModule], controllers: [PurchaseOrderController], providers: [PurchaseOrderService], exports: [PurchaseOrderService] })
export class PurchaseOrderModule {}
