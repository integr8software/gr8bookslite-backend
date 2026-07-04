export const StorageProviders = ['vps', 'supabase'] as const;
export const StorageEnvironments = ['local', 'shared-dev', 'staging'] as const;
export const StorageFolders = [
  'company-logos',
  'avatars',
  'attachments',
  'exports',
] as const;

export type StorageProviderName = (typeof StorageProviders)[number];
export type StorageEnvironment = (typeof StorageEnvironments)[number];
export type StorageFolder = (typeof StorageFolders)[number];

export type StorageUploadInput = {
  folder: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
};

export type StorageUploadResult = {
  relativePath: string;
  storagePath: string;
  publicUrl: string;
  fileName: string;
  mimeType: string;
  size: number;
};

export interface StorageProvider {
  uploadFile(input: StorageUploadInput): Promise<StorageUploadResult>;
  deleteFile(relativePath: string | null | undefined): Promise<void>;
  moveFile(params: {
    sourcePath: string;
    destinationPath: string;
  }): Promise<
    Pick<StorageUploadResult, 'relativePath' | 'storagePath' | 'publicUrl'>
  >;
  getPublicUrl(relativePath: string): string;
}
