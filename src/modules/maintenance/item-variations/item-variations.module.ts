import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { ItemVariationsController } from './item-variations.controller';
import { ItemVariationsService } from './item-variations.service';
import { ItemVariationsLookupService } from './lookups/item-variations-lookup.service';

@Module({
  imports: [PrismaModule, AccessControlModule, AuthModule],
  controllers: [ItemVariationsController],
  providers: [ItemVariationsService, ItemVariationsLookupService],
  exports: [ItemVariationsService, ItemVariationsLookupService],
})
export class ItemVariationsModule {}
