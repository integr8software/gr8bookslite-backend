import { BadRequestException } from '@nestjs/common';
import type { UploadedLogoFile } from '../types/uploaded-logo-file.type';

const MaxLogoFileSizeInBytes = 5 * 1024 * 1024;

export function validateOnboardingLogoFile(file: UploadedLogoFile | undefined) {
  if (!file) {
    throw new BadRequestException('Upload a logo image.');
  }

  if (!file.mimetype.startsWith('image/')) {
    throw new BadRequestException('Only image files are allowed.');
  }

  if (file.size > MaxLogoFileSizeInBytes) {
    throw new BadRequestException('Logo must be 5MB or smaller.');
  }

  return file;
}
