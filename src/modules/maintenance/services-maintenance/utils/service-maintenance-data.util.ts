import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma, ServiceAccountSetupMode } from '@prisma/client';
import { cleanOptional, normalizeIdentityValue } from '../../../../common/utils/string-normalization.util';
import { CreateServiceMaintenanceDto } from '../dto/create-service-maintenance.dto';
import { GetServiceMaintenanceListQueryDto } from '../dto/get-service-maintenance-list-query.dto';
import { UpdateServiceMaintenanceDto } from '../dto/update-service-maintenance.dto';

export function buildServiceMaintenanceListWhere(companyId: number, query: GetServiceMaintenanceListQueryDto): Prisma.ServiceMaintenanceWhereInput {
  const search = query.search?.trim();

  return {
    companyId,
    deletedAt: null,
    ...(query.status ? { status: query.status } : {}),
    ...(query.accountSetupMode ? { accountSetupMode: query.accountSetupMode } : {}),
    ...(query.serviceType ? { serviceType: query.serviceType } : {}),
    ...(search
      ? {
          OR: [
            { serviceName: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            {
              revenueCoa: {
                accountCode: { contains: search, mode: 'insensitive' },
              },
            },
            {
              revenueCoa: {
                accountTitle: { contains: search, mode: 'insensitive' },
              },
            },
          ],
        }
      : {}),
  };
}

export function buildServiceMaintenanceOrderBy(query: GetServiceMaintenanceListQueryDto): Prisma.ServiceMaintenanceOrderByWithRelationInput[] {
  const sortBy = query.sortBy ?? 'serviceName';
  const sortDirection = query.sortDirection ?? 'asc';

  return [{ [sortBy]: sortDirection }, { id: 'asc' }];
}

export function validateServiceMaintenanceInput(dto: CreateServiceMaintenanceDto | UpdateServiceMaintenanceDto) {
  if (dto.serviceName !== undefined && !dto.serviceName.trim()) {
    throw new BadRequestException('Service name is required.');
  }

  if (dto.accountSetupMode === ServiceAccountSetupMode.EXISTING && !dto.revenueCoaId?.trim()) {
    throw new BadRequestException('Revenue account is required when selecting an existing account.');
  }
}

export function resolveServiceRevenueAccountTitle(serviceName: string) {
  return serviceName.trim();
}

export function toCreateServiceMaintenanceData(dto: CreateServiceMaintenanceDto, revenueCoaId: bigint, isGeneratedRevenueAccount: boolean) {
  return {
    serviceName: dto.serviceName.trim(),
    serviceType: dto.serviceType,
    description: cleanOptional(dto.description),
    accountSetupMode: dto.accountSetupMode,
    revenueCoaId,
    isGeneratedRevenueAccount,
  };
}

export function toUpdateServiceMaintenanceData(dto: UpdateServiceMaintenanceDto, revenueCoaId?: bigint, isGeneratedRevenueAccount?: boolean) {
  return {
    ...(dto.serviceName !== undefined ? { serviceName: dto.serviceName.trim() } : {}),
    ...(dto.serviceType !== undefined ? { serviceType: dto.serviceType } : {}),
    ...(dto.description !== undefined ? { description: cleanOptional(dto.description) } : {}),
    ...(dto.accountSetupMode !== undefined ? { accountSetupMode: dto.accountSetupMode } : {}),
    ...(revenueCoaId !== undefined ? { revenueCoaId } : {}),
    ...(isGeneratedRevenueAccount !== undefined ? { isGeneratedRevenueAccount } : {}),
    ...(dto.status !== undefined ? { status: dto.status } : {}),
  } satisfies Prisma.ServiceMaintenanceUpdateInput;
}

export function getServiceMaintenanceIdentityKey(serviceName: string) {
  return normalizeIdentityValue(serviceName);
}

export function ensureNoDuplicateServiceName(existingName: string | undefined, nextName: string) {
  if (existingName && getServiceMaintenanceIdentityKey(existingName) === getServiceMaintenanceIdentityKey(nextName)) {
    throw new ConflictException('A service with this name already exists.');
  }
}
