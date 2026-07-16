import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseStorageProvider } from './providers/supabase-storage.provider';
import { VpsStorageProvider } from './providers/vps-storage.provider';
import type { StorageProvider, StorageProviderName, StorageUploadInput } from './storage.types';

@Injectable()
export class StorageService {
  private readonly provider: StorageProvider;

  constructor(configService: ConfigService, vpsStorageProvider: VpsStorageProvider, supabaseStorageProvider: SupabaseStorageProvider) {
    const providerName = configService.get<StorageProviderName>('STORAGE_PROVIDER', 'supabase').trim().toLowerCase() as StorageProviderName;

    if (providerName === 'vps') {
      this.provider = vpsStorageProvider;
      return;
    }

    if (providerName === 'supabase') {
      this.provider = supabaseStorageProvider;
      return;
    }

    throw new Error('Invalid STORAGE_PROVIDER. Expected one of: vps, supabase.');
  }

  uploadFile(input: StorageUploadInput) {
    return this.provider.uploadFile(input);
  }

  deleteFile(relativePath: string | null | undefined) {
    return this.provider.deleteFile(relativePath);
  }

  moveFile(params: { sourcePath: string; destinationPath: string }) {
    return this.provider.moveFile(params);
  }

  getPublicUrl(relativePath: string) {
    return this.provider.getPublicUrl(relativePath);
  }
}
