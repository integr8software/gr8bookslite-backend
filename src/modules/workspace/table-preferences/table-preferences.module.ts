import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { TablePreferencesController } from './table-preferences.controller';
import { TablePreferencesService } from './table-preferences.service';

@Module({
  imports: [PrismaModule, AccessControlModule, AuthModule],
  controllers: [TablePreferencesController],
  providers: [TablePreferencesService],
})
export class TablePreferencesModule {}
