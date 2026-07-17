import { BadGatewayException, Injectable } from '@nestjs/common';
import { StorageService } from '../../../storage/storage.service';

const AllowedMimeTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);

@Injectable()
export class OnboardingLogoStorageService {
  constructor(private readonly storageService: StorageService) {}

  async uploadLogo(params: { userId: number; fileName: string; mimeType: string; fileBuffer: Buffer }) {
    if (!AllowedMimeTypes.has(params.mimeType)) {
      throw new BadGatewayException('Unsupported logo file type.');
    }

    return this.storageService.uploadFile({
      folder: `company-logos/onboarding-user-${params.userId}`,
      fileName: params.fileName,
      mimeType: params.mimeType,
      buffer: params.fileBuffer,
    });
  }

  async moveLogo(params: { sourcePath: string; destinationPath: string }) {
    return this.storageService.moveFile(params);
  }
}
