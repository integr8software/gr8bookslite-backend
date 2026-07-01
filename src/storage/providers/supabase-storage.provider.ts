import { randomUUID } from 'node:crypto';
import { BadGatewayException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  buildSafeFileName,
  encodeStoragePath,
  sanitizeRelativePath,
  validateStorageFolder,
} from '../storage-path.util';
import type {
  StorageProvider,
  StorageUploadInput,
  StorageUploadResult,
} from '../storage.types';

@Injectable()
export class SupabaseStorageProvider implements StorageProvider {
  constructor(private readonly configService: ConfigService) {}

  async uploadFile(input: StorageUploadInput): Promise<StorageUploadResult> {
    const folder = validateStorageFolder(input.folder);
    const fileName = `${Date.now()}-${randomUUID()}-${buildSafeFileName(input.fileName)}`;
    const relativePath = `${folder}/${fileName}`;
    const response = await fetch(
      `${this.getSupabaseUrl()}/storage/v1/object/${this.getBucket()}/${encodeStoragePath(relativePath)}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.getServiceRoleKey()}`,
          apikey: this.getServiceRoleKey(),
          'Content-Type': input.mimeType,
          'x-upsert': 'true',
        },
        body: input.buffer as unknown as BodyInit,
      },
    );

    if (!response.ok) {
      const failureText = await response.text();

      throw new BadGatewayException(
        failureText || 'Supabase storage upload failed.',
      );
    }

    return {
      relativePath,
      storagePath: relativePath,
      publicUrl: this.getPublicUrl(relativePath),
      fileName,
      mimeType: input.mimeType,
      size: input.buffer.length,
    };
  }

  async deleteFile(relativePath: string | null | undefined) {
    if (!relativePath) {
      return;
    }

    const storagePath = sanitizeRelativePath(relativePath);
    const response = await fetch(
      `${this.getSupabaseUrl()}/storage/v1/object/${this.getBucket()}/${encodeStoragePath(storagePath)}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${this.getServiceRoleKey()}`,
          apikey: this.getServiceRoleKey(),
        },
      },
    );

    if (!response.ok && response.status !== 404) {
      const failureText = await response.text();

      throw new BadGatewayException(
        failureText || 'Supabase storage delete failed.',
      );
    }
  }

  async moveFile(params: { sourcePath: string; destinationPath: string }) {
    const sourcePath = sanitizeRelativePath(params.sourcePath);
    const destinationPath = sanitizeRelativePath(params.destinationPath);
    const response = await fetch(
      `${this.getSupabaseUrl()}/storage/v1/object/move`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.getServiceRoleKey()}`,
          apikey: this.getServiceRoleKey(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bucketId: this.getBucket(),
          sourceKey: sourcePath,
          destinationKey: destinationPath,
        }),
      },
    );

    if (!response.ok) {
      const failureText = await response.text();

      throw new BadGatewayException(
        failureText || 'Supabase storage move failed.',
      );
    }

    return {
      relativePath: destinationPath,
      storagePath: destinationPath,
      publicUrl: this.getPublicUrl(destinationPath),
    };
  }

  getPublicUrl(relativePath: string) {
    return `${this.getSupabaseUrl()}/storage/v1/object/public/${this.getBucket()}/${encodeStoragePath(sanitizeRelativePath(relativePath))}`;
  }

  private getSupabaseUrl() {
    return this.requireConfig('SUPABASE_URL').replace(/\/+$/, '');
  }

  private getServiceRoleKey() {
    return this.requireConfig('SUPABASE_SERVICE_ROLE_KEY');
  }

  private getBucket() {
    return this.requireConfig('SUPABASE_STORAGE_BUCKET');
  }

  private requireConfig(key: string) {
    const value = this.configService.get<string>(key, '').trim();

    if (!value) {
      throw new Error(`${key} is required when STORAGE_PROVIDER=supabase.`);
    }

    return value;
  }
}
