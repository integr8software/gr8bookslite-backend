import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { DefaultAccountController } from './default-account.controller';
import { DefaultAccountService } from './default-account.service';
import { DefaultAccountLookupService } from './lookups/default-account-lookup.service';

@Module({
  imports: [PrismaModule, AccessControlModule, AuthModule],
  controllers: [DefaultAccountController],
  providers: [DefaultAccountService, DefaultAccountLookupService],
  exports: [DefaultAccountService, DefaultAccountLookupService],
})
export class DefaultAccountModule {}
