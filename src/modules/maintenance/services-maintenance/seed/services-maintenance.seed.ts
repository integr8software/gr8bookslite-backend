import { ChartAccountStatus, Prisma, ServiceAccountSetupMode } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';

type ServiceMaintenanceWriteClient = PrismaService | Prisma.TransactionClient;

export const ServicesMaintenanceSeedRecords = [
  {
    serviceName: 'Service Revenue',
    description: 'Default service revenue record used by Services Maintenance.',
    revenueAccountCode: '4020000001',
  },
] as const;

export async function seedCompanyServicesMaintenanceDefaults(tx: ServiceMaintenanceWriteClient, companyId: number) {
  let createdCount = 0;

  for (const service of ServicesMaintenanceSeedRecords) {
    const revenueAccount = await tx.chartAccount.findFirst({
      where: {
        companyId,
        accountCode: service.revenueAccountCode,
        status: ChartAccountStatus.ACTIVE,
        deletedAt: null,
        isPostingAccount: true,
      },
      select: {
        id: true,
      },
    });

    if (!revenueAccount) {
      throw new Error(`Services Maintenance default ${service.serviceName} references a missing account: ${service.revenueAccountCode}.`);
    }

    const existingService = await tx.serviceMaintenance.findUnique({
      where: {
        companyId_serviceName: {
          companyId,
          serviceName: service.serviceName,
        },
      },
      select: {
        id: true,
      },
    });

    await tx.serviceMaintenance.upsert({
      where: {
        companyId_serviceName: {
          companyId,
          serviceName: service.serviceName,
        },
      },
      update: {
        description: service.description,
        revenueCoaId: revenueAccount.id,
        accountSetupMode: ServiceAccountSetupMode.EXISTING,
        isGeneratedRevenueAccount: false,
        status: ChartAccountStatus.ACTIVE,
        deletedAt: null,
      },
      create: {
        companyId,
        serviceName: service.serviceName,
        description: service.description,
        revenueCoaId: revenueAccount.id,
        accountSetupMode: ServiceAccountSetupMode.EXISTING,
        isGeneratedRevenueAccount: false,
        status: ChartAccountStatus.ACTIVE,
        createdByUserId: null,
      },
      select: {
        id: true,
      },
    });

    if (!existingService) {
      createdCount += 1;
    }
  }

  return createdCount;
}
