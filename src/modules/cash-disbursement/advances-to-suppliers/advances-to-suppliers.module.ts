import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { TablePreferencesModule } from '../../table-preferences/table-preferences.module';
import { AdvancesToSuppliersController } from './advances-to-suppliers.controller';
import { AdvancesToSuppliersService } from './advances-to-suppliers.service';

@Module({
  imports: [PrismaModule, AccessControlModule, AuthModule, TablePreferencesModule],
  controllers: [AdvancesToSuppliersController],
  providers: [AdvancesToSuppliersService],
  exports: [AdvancesToSuppliersService],
})
export class AdvancesToSuppliersModule {}
