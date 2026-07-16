import { Module } from '@nestjs/common';
import { VpsStorageInternalController } from './internal/vps-storage-internal.controller';
import { VpsStorageInternalService } from './internal/vps-storage-internal.service';
import { SupabaseStorageProvider } from './providers/supabase-storage.provider';
import { VpsStorageProvider } from './providers/vps-storage.provider';
import { StorageService } from './storage.service';

@Module({
  controllers: [VpsStorageInternalController],
  providers: [VpsStorageProvider, SupabaseStorageProvider, StorageService, VpsStorageInternalService],
  exports: [StorageService],
})
export class StorageModule {}
