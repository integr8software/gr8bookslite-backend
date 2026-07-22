import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { ItemVariationsController } from './item-variations.controller';
import { ItemVariationsService } from './item-variations.service';

@Module({
  imports: [PrismaModule, AccessControlModule, AuthModule],
  controllers: [ItemVariationsController],
  providers: [ItemVariationsService],
  exports: [ItemVariationsService],
})
export class ItemVariationsModule {}
