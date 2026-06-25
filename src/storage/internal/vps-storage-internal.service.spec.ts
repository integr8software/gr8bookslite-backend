import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ConfigService } from '@nestjs/config';
import { VpsStorageInternalService } from './vps-storage-internal.service';

describe('VpsStorageInternalService', () => {
  let root: string;
  let service: VpsStorageInternalService;

  beforeEach(async () => {
    root = await mkdtemp(path.join(os.tmpdir(), 'gr8books-vps-storage-'));
    service = new VpsStorageInternalService(
      new ConfigService({
        VPS_STORAGE_ROOT: root,
        VPS_STORAGE_PUBLIC_URL: 'http://storage.example.com',
        VPS_STORAGE_SECRET: 'test-secret',
      }),
    );
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('uploads files below the requested environment and folder', async () => {
    const result = await service.upload({
      authorization: 'Bearer test-secret',
      storageEnv: 'shared-dev',
      folder: 'avatars/user-4',
      file: {
        originalname: 'My Avatar.JPG',
        mimetype: 'image/jpeg',
        size: 12,
        buffer: Buffer.from('avatar-bytes'),
      },
    });

    expect(result.relativePath).toMatch(
      /^shared-dev\/avatars\/user-4\/\d+-[\da-f-]+-My-Avatar\.jpg$/,
    );
    expect(result.publicUrl).toBe(
      `http://storage.example.com/${result.relativePath}`,
    );
    expect(result.mimeType).toBe('image/jpeg');
    expect(result.size).toBe(12);
    await expect(
      readFile(path.join(root, result.relativePath), 'utf8'),
    ).resolves.toBe('avatar-bytes');
  });

  it('deletes files by relative path', async () => {
    const result = await service.upload({
      authorization: 'Bearer test-secret',
      storageEnv: 'local',
      folder: 'company-logos/company-1',
      file: {
        originalname: 'logo.png',
        mimetype: 'image/png',
        size: 10,
        buffer: Buffer.from('logo-bytes'),
      },
    });

    await service.delete({
      authorization: 'Bearer test-secret',
      relativePath: result.relativePath,
    });

    await expect(stat(path.join(root, result.relativePath))).rejects.toThrow();
  });

  it('accepts stored delete paths with storage env and nested folders', async () => {
    const result = await service.upload({
      authorization: 'Bearer test-secret',
      storageEnv: 'shared-dev',
      folder: 'avatars/user-4',
      file: {
        originalname: 'avatar.jpg',
        mimetype: 'image/jpeg',
        size: 12,
        buffer: Buffer.from('avatar-bytes'),
      },
    });

    await expect(
      service.delete({
        authorization: 'Bearer test-secret',
        relativePath: result.relativePath,
      }),
    ).resolves.toEqual({
      deleted: true,
      relativePath: result.relativePath,
    });
  });

  it('treats missing but safe files as successful deletes', async () => {
    await expect(
      service.delete({
        authorization: 'Bearer test-secret',
        relativePath: 'staging/company-logos/company-1/missing.png',
      }),
    ).resolves.toEqual({
      deleted: true,
      relativePath: 'staging/company-logos/company-1/missing.png',
    });
  });

  it('rejects unauthorized requests', async () => {
    await expect(
      service.upload({
        authorization: 'Bearer wrong-secret',
        storageEnv: 'local',
        folder: 'company-logos',
        file: {
          originalname: 'logo.png',
          mimetype: 'image/png',
          size: 10,
          buffer: Buffer.from('logo-bytes'),
        },
      }),
    ).rejects.toThrow('Invalid storage authorization.');
  });

  it('rejects invalid folders and path traversal', async () => {
    await expect(
      service.upload({
        authorization: 'Bearer test-secret',
        storageEnv: 'local',
        folder: '../avatars',
        file: {
          originalname: 'avatar.png',
          mimetype: 'image/png',
          size: 10,
          buffer: Buffer.from('avatar-bytes'),
        },
      }),
    ).rejects.toThrow('Invalid storage path.');

    await expect(
      service.upload({
        authorization: 'Bearer test-secret',
        storageEnv: 'local',
        folder: 'private',
        file: {
          originalname: 'avatar.png',
          mimetype: 'image/png',
          size: 10,
          buffer: Buffer.from('avatar-bytes'),
        },
      }),
    ).rejects.toThrow('Invalid storage folder.');
  });
});
