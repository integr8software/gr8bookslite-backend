import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const AllowedMimeTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);

function sanitizeFileName(value: string) {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function encodeStoragePath(path: string) {
  return path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

@Injectable()
export class WorkspaceCompanyLogoStorageService {
  private readonly supabaseUrl: string;
  private readonly serviceRoleKey: string;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    this.supabaseUrl = this.configService
      .get<string>('SUPABASE_URL', '')
      .trim();
    this.serviceRoleKey = this.configService
      .get<string>('SUPABASE_SERVICE_ROLE_KEY', '')
      .trim();
    this.bucket = this.configService
      .get<string>('SUPABASE_STORAGE_BUCKET', '')
      .trim();
  }

  async uploadLogo(params: {
    companyId: number;
    fileName: string;
    mimeType: string;
    fileBuffer: Buffer;
  }) {
    this.ensureConfiguration();

    if (!AllowedMimeTypes.has(params.mimeType)) {
      throw new BadGatewayException('Unsupported logo file type.');
    }

    const safeFileName = sanitizeFileName(params.fileName) || 'logo';
    const storagePath = `companies/company-${params.companyId}/logo/${Date.now()}-${safeFileName}`;
    const uploadUrl = `${this.supabaseUrl}/storage/v1/object/${this.bucket}/${encodeStoragePath(storagePath)}`;

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.serviceRoleKey}`,
        apikey: this.serviceRoleKey,
        'Content-Type': params.mimeType,
        'x-upsert': 'true',
      },
      body: params.fileBuffer as unknown as BodyInit,
    });

    if (!response.ok) {
      const failureText = await response.text();

      throw new BadGatewayException(
        failureText || 'Supabase logo upload failed.',
      );
    }

    return {
      fileName: safeFileName,
      mimeType: params.mimeType,
      storagePath,
      publicUrl: this.buildPublicUrl(storagePath),
    };
  }

  private buildPublicUrl(storagePath: string) {
    return `${this.supabaseUrl}/storage/v1/object/public/${this.bucket}/${encodeStoragePath(storagePath)}`;
  }

  private ensureConfiguration() {
    if (!this.supabaseUrl || !this.serviceRoleKey || !this.bucket) {
      throw new InternalServerErrorException(
        'Supabase storage is not configured on the backend.',
      );
    }
  }
}
