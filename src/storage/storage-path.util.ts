import path from 'node:path';
import { BadRequestException } from '@nestjs/common';
import { StorageEnvironments, StorageFolders, type StorageEnvironment, type StorageFolder } from './storage.types';

export function sanitizeRelativePath(value: string) {
  const normalized = value.replace(/\\/g, '/');
  const segments = normalized
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (segments.length === 0 || normalized.startsWith('/') || segments.some((segment) => segment === '.' || segment === '..')) {
    throw new BadRequestException('Invalid storage path.');
  }

  return segments.map(sanitizePathSegment).join('/');
}

export function sanitizePathSegment(value: string) {
  const sanitized = value
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (!sanitized || sanitized === '.' || sanitized === '..') {
    throw new BadRequestException('Invalid storage path.');
  }

  return sanitized;
}

export function buildSafeFileName(fileName: string) {
  const parsed = path.parse(fileName);
  const baseName = sanitizePathSegment(parsed.name || 'file');
  const extension = parsed.ext.toLowerCase().replace(/[^a-z0-9.]+/g, '');

  return `${baseName}${extension && extension !== '.' ? extension : ''}`;
}

export function encodeStoragePath(relativePath: string) {
  return relativePath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

export function validateStorageEnvironment(value: string): StorageEnvironment {
  if (!StorageEnvironments.includes(value as StorageEnvironment)) {
    throw new BadRequestException('Invalid storage environment.');
  }

  return value as StorageEnvironment;
}

export function validateStorageFolder(value: string) {
  const relativePath = sanitizeRelativePath(value);
  const [folder] = relativePath.split('/');

  if (!StorageFolders.includes(folder as StorageFolder)) {
    throw new BadRequestException('Invalid storage folder.');
  }

  return relativePath;
}

export function stripStorageEnvironment(relativePath: string) {
  const cleanPath = sanitizeRelativePath(relativePath);
  const [firstSegment, ...remainingSegments] = cleanPath.split('/');

  if (StorageEnvironments.includes(firstSegment as StorageEnvironment) && remainingSegments.length > 0) {
    return remainingSegments.join('/');
  }

  return cleanPath;
}
