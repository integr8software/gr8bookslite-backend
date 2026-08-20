import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { FieldManagementController } from './field-management.controller';
import { FieldManagementService } from './field-management.service';

@Module({
  imports: [PrismaModule, AccessControlModule, AuthModule],
  controllers: [FieldManagementController],
  providers: [FieldManagementService],
})
export class FieldManagementModule {}
