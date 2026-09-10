import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { CollectionTypeService } from './collection-type.service';
import { CollectionTypeController } from './collection-type.controller';

@Module({
  imports: [PrismaModule, AccessControlModule, AuthModule],
  controllers: [CollectionTypeController],
  providers: [CollectionTypeService],
})
export class CollectionTypeModule {}
