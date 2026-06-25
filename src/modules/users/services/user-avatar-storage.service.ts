import { BadGatewayException, Injectable } from '@nestjs/common';
import { StorageService } from '../../../storage/storage.service';

const AllowedMimeTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);

@Injectable()
export class UserAvatarStorageService {
  constructor(private readonly storageService: StorageService) {}

  async uploadAvatar(params: {
    userId: number;
    fileName: string;
    mimeType: string;
    fileBuffer: Buffer;
  }) {
    if (!AllowedMimeTypes.has(params.mimeType)) {
      throw new BadGatewayException('Unsupported avatar file type.');
    }

    return this.storageService.uploadFile({
      folder: `avatars/user-${params.userId}`,
      fileName: params.fileName,
      mimeType: params.mimeType,
      buffer: params.fileBuffer,
    });
  }

  async removeAvatar(storagePath: string | null | undefined) {
    await this.storageService.deleteFile(storagePath);
  }
}
