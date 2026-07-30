import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { ItemCategoryController } from './item-category.controller';
import { ItemCategoryService } from './item-category.service';
import { ItemCategoryLookupService } from './lookups/item-category-lookup.service';

@Module({
  imports: [PrismaModule, AccessControlModule, AuthModule],
  controllers: [ItemCategoryController],
  providers: [ItemCategoryService, ItemCategoryLookupService],
  exports: [ItemCategoryService, ItemCategoryLookupService],
})
export class ItemCategoryModule {}
