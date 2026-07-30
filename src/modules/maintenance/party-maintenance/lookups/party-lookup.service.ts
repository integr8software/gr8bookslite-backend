import { BadRequestException, Injectable } from '@nestjs/common';
import { ChartAccountStatus, PartyClassification, PartyStatus, PartyType } from '@prisma/client';
import type { AuthUser } from '../../../../common/interfaces/auth-user.interface';
import { PrismaService } from '../../../../prisma/prisma.service';
import { buildPartyAccountingAccountOptions } from '../utils/party-accounting-account.util';

import { ensureActiveCompanyAccess, getActiveCompanyId } from '../../../../common/utils/module-access.util';
@Injectable()
export class PartyLookupService {
  constructor(private readonly prisma: PrismaService) {}

  async findOptionsForCompanyUser(user: AuthUser, partyType: string) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);

    return {
      parties: await this.findOptions({
        companyId,
        partyType: this.parsePartyType(partyType),
      }),
    };
  }

  async findOptions({ companyId, partyType }: { companyId: number; partyType: PartyType }) {
    const parties = await this.prisma.party.findMany({
      where: {
        companyId,
        deletedAt: null,
        status: PartyStatus.ACTIVE,
        partyTypes: {
          has: partyType,
        },
      },
      orderBy: [{ partyName: 'asc' }, { lastName: 'asc' }, { firstName: 'asc' }, { partyCodeNo: 'asc' }],
      select: {
        id: true,
        partyCodeNo: true,
        classification: true,
        partyTypes: true,
        partyName: true,
        tradeName: true,
        firstName: true,
        middleName: true,
        lastName: true,
        suffixName: true,
        contactPerson: true,
        email: true,
        contactNo: true,
        status: true,
      },
    });

    return parties.map((party) => ({
      id: party.id.toString(),
      partyCodeNo: party.partyCodeNo,
      classification: party.classification,
      partyTypes: party.partyTypes,
      name: this.getPartyOptionName(party),
      contactPerson: party.contactPerson ?? '',
      email: party.email ?? '',
      contactNo: party.contactNo ?? '',
      status: party.status,
    }));
  }

  async findAccountingOptions({ companyId }: { companyId: number }) {
    const accounts = await this.prisma.chartAccount.findMany({
      where: {
        companyId,
        status: ChartAccountStatus.ACTIVE,
        deletedAt: null,
      },
      orderBy: [{ accountCode: 'asc' }, { orderNo: 'asc' }, { accountTitle: 'asc' }],
    });

    return buildPartyAccountingAccountOptions(accounts);
  }

  private parsePartyType(value: string) {
    const normalizedValue = value.trim().toUpperCase();

    if (normalizedValue in PartyType) {
      return PartyType[normalizedValue as keyof typeof PartyType];
    }

    throw new BadRequestException('Choose a valid party type.');
  }

  private getPartyOptionName(party: {
    classification: PartyClassification;
    firstName: string | null;
    lastName: string | null;
    middleName: string | null;
    partyName: string | null;
    suffixName: string | null;
    tradeName: string | null;
  }) {
    if (party.classification === PartyClassification.NON_INDIVIDUAL) {
      return party.tradeName?.trim() || party.partyName?.trim() || 'Unnamed Party';
    }

    const fullName = [party.firstName, party.middleName, party.lastName, party.suffixName]
      .map((namePart) => namePart?.trim())
      .filter(Boolean)
      .join(' ');

    return fullName || party.partyName?.trim() || 'Unnamed Party';
  }
}
