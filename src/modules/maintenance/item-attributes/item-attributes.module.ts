import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { ItemAttributesController } from './item-attributes.controller';
import { ItemAttributesService } from './item-attributes.service';

@Module({
  imports: [PrismaModule, AccessControlModule, AuthModule],
  controllers: [ItemAttributesController],
  providers: [ItemAttributesService],
  exports: [ItemAttributesService],
})
export class ItemAttributesModule {}
