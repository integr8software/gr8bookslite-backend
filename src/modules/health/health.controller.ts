import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@Public()
@SkipThrottle()
@Controller({
  path: 'health',
  version: '1',
})
export class HealthController {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async getHealth() {
    const database = await this.getDatabaseHealth();
    const [
      modules,
      permissions,
      moduleSystemSidebarTemplates,
      platformVersion,
    ] = await Promise.all([
      this.prisma.module.count().catch(() => null),
      this.prisma.permission.count().catch(() => null),
      this.prisma.moduleSystemSidebar.count().catch(() => null),
      this.prisma.platformVersion
        .findUnique({
          where: { id: 1 },
          select: {
            appliedAt: true,
            currentVersion: true,
            status: true,
          },
        })
        .catch(() => null),
    ]);
    const provisioned =
      database.status === 'ok' &&
      Boolean(platformVersion?.currentVersion) &&
      platformVersion?.status === 'APPLIED' &&
      modules !== null &&
      modules > 0 &&
      permissions !== null &&
      permissions > 0;

    return {
      status: provisioned ? 'ok' : 'degraded',
      database,
      redis: {
        status: 'not_configured',
      },
      storage: this.getStorageHealth(),
      platform: {
        provisionStatus: platformVersion?.status ?? 'missing',
        version: platformVersion?.currentVersion ?? null,
        appliedAt: platformVersion?.appliedAt?.toISOString() ?? null,
      },
      counts: {
        modules,
        permissions,
        moduleSystemSidebarTemplates,
      },
    };
  }

  private async getDatabaseHealth() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok' };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private getStorageHealth() {
    const provider = this.configService.get<string>('STORAGE_PROVIDER');

    if (provider !== 'vps') {
      return {
        provider: provider ?? 'supabase',
        status: 'configured',
      };
    }

    const publicUrl = this.configService.get<string>('VPS_STORAGE_PUBLIC_URL');
    const root = this.configService.get<string>('VPS_STORAGE_ROOT');

    return {
      provider,
      publicUrl: publicUrl || null,
      rootConfigured: Boolean(root?.trim()),
      status: publicUrl && root ? 'configured' : 'missing_configuration',
    };
  }
}
