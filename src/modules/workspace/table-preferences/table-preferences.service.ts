import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { PrismaService } from '../../../prisma/prisma.service';
import { SaveTablePreferenceDto } from './dto/save-table-preference.dto';

@Injectable()
export class TablePreferencesService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(user: AuthUser, moduleKey: string) {
    const companyId = this.getCompanyId(user);
    this.validateModuleKey(moduleKey);
    const preference = await this.prisma.userTablePreference.findUnique({
      where: {
        userId_companyId_moduleKey: {
          userId: user.id,
          companyId,
          moduleKey,
        },
      },
      select: { configuration: true },
    });

    return { configuration: preference?.configuration ?? null };
  }

  async save(user: AuthUser, moduleKey: string, dto: SaveTablePreferenceDto) {
    const companyId = this.getCompanyId(user);
    this.validateModuleKey(moduleKey);
    const preference = await this.prisma.userTablePreference.upsert({
      where: {
        userId_companyId_moduleKey: {
          userId: user.id,
          companyId,
          moduleKey,
        },
      },
      create: {
        userId: user.id,
        companyId,
        moduleKey,
        configuration: dto.configuration as Prisma.InputJsonObject,
      },
      update: {
        configuration: dto.configuration as Prisma.InputJsonObject,
      },
      select: { configuration: true },
    });

    return { configuration: preference.configuration };
  }

  private getCompanyId(user: AuthUser) {
    if (!user.companyId) {
      throw new BadRequestException('Select an active company first.');
    }

    return user.companyId;
  }

  private validateModuleKey(moduleKey: string) {
    if (!/^[a-z0-9][a-z0-9:-]{0,119}$/.test(moduleKey)) {
      throw new BadRequestException('Invalid table preference module key.');
    }
  }
}
