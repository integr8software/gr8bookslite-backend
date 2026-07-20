import { BadGatewayException, Injectable } from '@nestjs/common';
import { StorageService } from '../../../../storage/storage.service';

const AllowedMimeTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);

@Injectable()
export class WorkspaceCompanyLogoStorageService {
  constructor(private readonly storageService: StorageService) {}

  async uploadLogo(params: { companyId: number; fileName: string; mimeType: string; fileBuffer: Buffer }) {
    if (!AllowedMimeTypes.has(params.mimeType)) {
      throw new BadGatewayException('Unsupported logo file type.');
    }

    return this.storageService.uploadFile({
      folder: `company-logos/company-${params.companyId}`,
      fileName: params.fileName,
      mimeType: params.mimeType,
      buffer: params.fileBuffer,
    });
  }
}
