import { BadGatewayException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { encodeStoragePath, stripStorageEnvironment, validateStorageFolder } from '../storage-path.util';
import type { StorageProvider, StorageUploadInput, StorageUploadResult } from '../storage.types';

@Injectable()
export class VpsStorageProvider implements StorageProvider {
  constructor(private readonly configService: ConfigService) {}

  async uploadFile(input: StorageUploadInput): Promise<StorageUploadResult> {
    const folder = validateStorageFolder(input.folder);
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(input.buffer)], {
      type: input.mimeType,
    });

    formData.append('file', blob, input.fileName);
    formData.append('storageEnv', this.requireConfig('STORAGE_ENV'));
    formData.append('folder', folder);

    const response = await fetch(`${this.getApiUrl()}/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.requireConfig('VPS_STORAGE_SECRET')}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new BadGatewayException(await buildVpsFailureMessage('upload', response));
    }

    const result = (await response.json()) as StorageUploadResult;

    return {
      ...result,
      storagePath: result.relativePath,
    };
  }

  async deleteFile(relativePath: string | null | undefined) {
    if (!relativePath) {
      return;
    }

    const response = await fetch(`${this.getApiUrl()}/file`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${this.requireConfig('VPS_STORAGE_SECRET')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        relativePath: this.withStorageEnvironment(relativePath),
      }),
    });

    if (!response.ok && response.status !== 404) {
      throw new BadGatewayException(await buildVpsFailureMessage('delete', response));
    }
  }

  async moveFile(): Promise<Pick<StorageUploadResult, 'relativePath' | 'storagePath' | 'publicUrl'>> {
    throw new BadGatewayException('VPS storage move is not supported.');
  }

  getPublicUrl(relativePath: string) {
    return `${this.getPublicUrlRoot()}/${encodeStoragePath(this.withStorageEnvironment(relativePath))}`;
  }

  private withStorageEnvironment(relativePath: string) {
    return `${this.requireConfig('STORAGE_ENV')}/${stripStorageEnvironment(relativePath)}`;
  }

  private getApiUrl() {
    return this.requireConfig('VPS_STORAGE_API_URL').replace(/\/+$/, '');
  }

  private getPublicUrlRoot() {
    return this.requireConfig('VPS_STORAGE_PUBLIC_URL').replace(/\/+$/, '');
  }

  private requireConfig(key: string) {
    const value = this.configService.get<string>(key, '').trim();

    if (!value) {
      throw new Error(`${key} is required when STORAGE_PROVIDER=vps.`);
    }

    return value;
  }
}

async function buildVpsFailureMessage(operation: string, response: Response) {
  const responseText = await response.text();
  const detail = responseText.trim() || response.statusText || 'No response body.';

  return `VPS storage ${operation} failed with HTTP ${response.status}: ${detail}`;
}
