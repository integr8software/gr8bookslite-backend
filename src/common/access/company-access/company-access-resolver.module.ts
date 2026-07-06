import { Module } from '@nestjs/common';
import { CompanyAccessResolver } from './company-access-resolver.service';

@Module({
  providers: [CompanyAccessResolver],
  exports: [CompanyAccessResolver],
})
export class CompanyAccessResolverModule {}
