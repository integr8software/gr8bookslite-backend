import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { ItemsController } from './items.controller';
import { ItemsService } from './items.service';

@Module({ imports: [PrismaModule, AccessControlModule, AuthModule], controllers: [ItemsController], providers: [ItemsService] })
export class ItemsModule {}
