import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { MembershipRole, MembershipStatus } from '@prisma/client';
import { AppRole } from '../enums/app-role.enum';
import type { AuthUser } from '../interfaces/auth-user.interface';
import { PrismaService } from '../../prisma/prisma.service';

export function getActiveCompanyId(user: AuthUser) {
  if (!user.companyId) {
    throw new BadRequestException('Select an active company first.');
  }

  return user.companyId;
}

export async function ensureActiveCompanyAccess(prisma: PrismaService, user: AuthUser, companyId: number) {
  if (user.role === AppRole.SUPER_ADMIN) {
    return;
  }

  const membership = await prisma.membership.findUnique({
    where: {
      userId_companyId: {
        userId: user.id,
        companyId,
      },
    },
    select: {
      status: true,
    },
  });

  if (!membership || membership.status !== MembershipStatus.ACTIVE) {
    throw new NotFoundException('Company not found.');
  }
}

export function hasReservedRoleAccess(user: AuthUser, companyId: number) {
  if (user.role === AppRole.SUPER_ADMIN) {
    return true;
  }

  return (
    user.companyId === companyId &&
    user.membershipStatus === MembershipStatus.ACTIVE &&
    (user.role === AppRole.ADMIN || user.membershipRole === MembershipRole.ADMIN)
  );
}

export async function ensureActiveCompanyAdminAccess(prisma: PrismaService, user: AuthUser, companyId: number, forbiddenMessage: string) {
  if (user.role === AppRole.SUPER_ADMIN) {
    return;
  }

  const membership = await prisma.membership.findUnique({
    where: {
      userId_companyId: {
        userId: user.id,
        companyId,
      },
    },
    select: {
      role: true,
      status: true,
    },
  });

  if (!membership || membership.status !== MembershipStatus.ACTIVE || membership.role !== MembershipRole.ADMIN) {
    throw new ForbiddenException(forbiddenMessage);
  }
}
