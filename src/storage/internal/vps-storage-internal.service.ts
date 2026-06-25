import { randomUUID, timingSafeEqual } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  buildSafeFileName,
  encodeStoragePath,
  sanitizeRelativePath,
  validateStorageEnvironment,
  validateStorageFolder,
} from '../storage-path.util';

type UploadedStorageFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

@Injectable()
export class VpsStorageInternalService {
  constructor(private readonly configService: ConfigService) {}

  async upload(input: {
    authorization: string | undefined;
    storageEnv: string;
    folder: string;
    file: UploadedStorageFile | undefined;
  }) {
    this.assertAuthorized(input.authorization);

    if (!input.file) {
      throw new BadRequestException('Upload a file.');
    }

    const storageEnv = validateStorageEnvironment(input.storageEnv);
    const folder = validateStorageFolder(input.folder);
    const fileName = `${Date.now()}-${randomUUID()}-${buildSafeFileName(
      input.file.originalname,
    )}`;
    const relativePath = `${storageEnv}/${folder}/${fileName}`;
    const targetPath = this.resolveInsideRoot(relativePath);

    await mkdir(path.dirname(targetPath), { recursive: true });
    await writeFile(targetPath, input.file.buffer);

    return {
      relativePath,
      publicUrl: this.getPublicUrl(relativePath),
      fileName,
      mimeType: input.file.mimetype,
      size: input.file.size,
    };
  }

  async delete(input: {
    authorization: string | undefined;
    relativePath: string;
  }) {
    this.assertAuthorized(input.authorization);

    const relativePath = this.validateStoredRelativePath(input.relativePath);
    const targetPath = this.resolveInsideRoot(relativePath);

    await rm(targetPath, { force: true });

    return {
      deleted: true,
      relativePath,
    };
  }

  private validateStoredRelativePath(value: string) {
    const relativePath = sanitizeRelativePath(value);
    const [storageEnv, ...folderSegments] = relativePath.split('/');

    validateStorageEnvironment(storageEnv);
    validateStorageFolder(folderSegments.join('/'));

    return relativePath;
  }

  private resolveInsideRoot(relativePath: string) {
    const rootPath = path.resolve(this.requireConfig('VPS_STORAGE_ROOT'));
    const targetPath = path.resolve(rootPath, relativePath);
    const relativeToRoot = path.relative(rootPath, targetPath);

    if (
      relativeToRoot.startsWith('..') ||
      path.isAbsolute(relativeToRoot) ||
      relativeToRoot === ''
    ) {
      throw new BadRequestException('Invalid storage path.');
    }

    return targetPath;
  }

  private getPublicUrl(relativePath: string) {
    return `${this.requireConfig('VPS_STORAGE_PUBLIC_URL').replace(
      /\/+$/,
      '',
    )}/${encodeStoragePath(relativePath)}`;
  }

  private assertAuthorized(authorization: string | undefined) {
    const token = authorization?.replace(/^Bearer\s+/i, '').trim() ?? '';
    const expectedToken = this.requireConfig('VPS_STORAGE_SECRET');
    const tokenBuffer = Buffer.from(token);
    const expectedTokenBuffer = Buffer.from(expectedToken);

    if (
      tokenBuffer.length !== expectedTokenBuffer.length ||
      !timingSafeEqual(tokenBuffer, expectedTokenBuffer)
    ) {
      throw new UnauthorizedException('Invalid storage authorization.');
    }
  }

  private requireConfig(key: string) {
    const value = this.configService.get<string>(key, '').trim();

    if (!value) {
      throw new Error(`${key} is required for the VPS storage API.`);
    }

    return value;
  }
}
