import { BadRequestException } from '@nestjs/common';
import type { UploadedAvatarFile } from '../types/uploaded-avatar-file.type';

const AllowedAvatarMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MaxAvatarFileSizeInBytes = 2 * 1024 * 1024;

export function validateUserAvatarFile(file: UploadedAvatarFile | undefined) {
  if (!file) {
    throw new BadRequestException('Upload an avatar image.');
  }

  if (!AllowedAvatarMimeTypes.has(file.mimetype)) {
    throw new BadRequestException('Please upload a JPG, PNG, or WebP image.');
  }

  if (file.size > MaxAvatarFileSizeInBytes) {
    throw new BadRequestException('Avatar image must be 2MB or smaller.');
  }

  return file;
}
