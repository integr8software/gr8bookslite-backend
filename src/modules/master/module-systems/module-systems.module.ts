import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { ModuleSystemsController } from './module-systems.controller';
import { ModuleSystemsService } from './module-systems.service';

@Module({
  imports: [PrismaModule, AuthModule, AccessControlModule],
  controllers: [ModuleSystemsController],
  providers: [ModuleSystemsService],
  exports: [ModuleSystemsService],
})
export class ModuleSystemsModule {}
