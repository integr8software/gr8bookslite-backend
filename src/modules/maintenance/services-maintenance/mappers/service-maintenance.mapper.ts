import { resolveAuditUserNames, SystemGeneratedAuditLabel } from '../../../../common/utils/audit-user.util';
import type { AuditUserLookupClient } from '../../../../common/interfaces/audit-user-lookup-client.interface';
import type { ServiceMaintenancePayload } from '../types/service-maintenance.type';

export function mapServiceMaintenance(service: ServiceMaintenancePayload, userNames: Map<number, string> = new Map()) {
  return {
    id: service.id.toString(),
    serviceName: service.serviceName,
    serviceType: service.serviceType,
    description: service.description ?? '',
    status: service.status,
    accountSetupMode: service.accountSetupMode,
    revenueCoaId: service.revenueCoaId.toString(),
    revenueAccountCode: service.revenueCoa.accountCode,
    revenueAccountTitle: service.revenueCoa.accountTitle,
    isGeneratedRevenueAccount: service.isGeneratedRevenueAccount,
    createdBy: service.createdByUserId === null ? SystemGeneratedAuditLabel : (userNames.get(service.createdByUserId) ?? null),
    createdAt: service.createdAt.toISOString(),
    updatedBy: (service.updatedByUserId && userNames.get(service.updatedByUserId)) ?? null,
    updatedAt: service.updatedAt?.toISOString() ?? null,
    createdByUserId: service.createdByUserId,
    updatedByUserId: service.updatedByUserId,
  };
}

export async function mapServicesMaintenanceWithAuditUsers(prisma: AuditUserLookupClient, services: ServiceMaintenancePayload[]) {
  const userNames = await resolveAuditUserNames(
    prisma,
    services.flatMap((service) => [service.createdByUserId, service.updatedByUserId]),
  );

  return services.map((service) => mapServiceMaintenance(service, userNames));
}
