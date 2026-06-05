import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { FormSignatoriesController } from './form-signatories.controller';
import { FormSignatoriesService } from './form-signatories.service';

@Module({
  imports: [PrismaModule, AccessControlModule, AuthModule],
  controllers: [FormSignatoriesController],
  providers: [FormSignatoriesService],
})
export class FormSignatoriesModule {}
