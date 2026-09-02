import { BadRequestException } from '@nestjs/common';
import { PartyClassification, PartyStatus, PartyType, Prisma } from '@prisma/client';
import { PartyInclude } from '../prisma/party.include';
import { PartyLookupService } from './party-lookup.service';

describe('PartyLookupService', () => {
  const prisma = {
    cashAdvance: {
      groupBy: jest.fn(),
    },
    party: {
      findMany: jest.fn(),
    },
  };
  const service = new PartyLookupService(prisma as never);

  const basicParty = {
    id: 51n,
    partyCodeNo: 'EMP-00051',
    classification: PartyClassification.INDIVIDUAL,
    partyTypes: [PartyType.EMPLOYEE],
    partyName: null,
    tradeName: null,
    firstName: ' Ada ',
    middleName: 'M.',
    lastName: 'Lovelace',
    suffixName: null,
    contactPerson: null,
    email: 'ada@example.com',
    contactNo: null,
    status: PartyStatus.ACTIVE,
    cashAdvanceLimit: new Prisma.Decimal('1500.50'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.cashAdvance.groupBy.mockResolvedValue([]);
    prisma.party.findMany.mockResolvedValue([basicParty]);
  });

  it('filters basic options and serializes cash advance values', async () => {
    const result = await service.findOptions({
      companyId: 11,
      query: {
        partyTypes: ' employee,EMPLOYEE ',
        match: 'all',
        search: ' ada ',
      },
    });

    expect(prisma.party.findMany).toHaveBeenCalledWith({
      where: {
        companyId: 11,
        deletedAt: null,
        status: PartyStatus.ACTIVE,
        partyTypes: { hasEvery: [PartyType.EMPLOYEE] },
        OR: [
          { partyCodeNo: { contains: 'ada', mode: 'insensitive' } },
          { partyName: { contains: 'ada', mode: 'insensitive' } },
          { tradeName: { contains: 'ada', mode: 'insensitive' } },
          { firstName: { contains: 'ada', mode: 'insensitive' } },
          { middleName: { contains: 'ada', mode: 'insensitive' } },
          { lastName: { contains: 'ada', mode: 'insensitive' } },
          { contactPerson: { contains: 'ada', mode: 'insensitive' } },
          { email: { contains: 'ada', mode: 'insensitive' } },
          { contactNo: { contains: 'ada', mode: 'insensitive' } },
        ],
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
        cashAdvanceLimit: true,
      },
    });
    expect(result).toEqual([
      expect.objectContaining({
        id: '51',
        name: 'Ada M. Lovelace',
        cashAdvanceLimit: '1500.5',
        cashAdvanceBalance: '1500.5',
        totalCashAdvance: '0.00',
        availableCashAdvance: '1500.50',
      }),
    ]);
  });

  it('includes active cash advance totals and the remaining available amount', async () => {
    prisma.cashAdvance.groupBy.mockResolvedValue([
      {
        partyId: 51n,
        _sum: { amount: new Prisma.Decimal('400.25') },
      },
    ]);

    const result = await service.findOptions({ companyId: 11, query: {} });

    expect(result[0]).toEqual(
      expect.objectContaining({
        cashAdvanceLimit: '1500.5',
        totalCashAdvance: '400.25',
        availableCashAdvance: '1100.25',
        cashAdvanceBalance: '1100.25',
      }),
    );
  });

  it('returns empty cash advance values when no limit is configured', async () => {
    prisma.party.findMany.mockResolvedValue([{ ...basicParty, cashAdvanceLimit: null }]);

    const result = await service.findOptions({ companyId: 11, query: {} });

    expect(result[0]).toEqual(
      expect.objectContaining({
        cashAdvanceLimit: '',
        cashAdvanceBalance: '',
      }),
    );
  });

  it('includes cash advance values in complete options', async () => {
    prisma.party.findMany.mockResolvedValue([
      {
        ...basicParty,
        partyEntityType: null,
        addresses: [],
        defaultReceivableAccountId: null,
        customerAdvanceAccountId: null,
        defaultPayableAccountId: null,
        vendorAdvanceAccountId: null,
        employeeAdvanceAccountId: null,
        employeePayableAccountId: null,
        defaultReceivableAccount: null,
        customerAdvanceAccount: null,
        defaultPayableAccount: null,
        vendorAdvanceAccount: null,
        employeeAdvanceAccount: null,
        employeePayableAccount: null,
        termId: null,
        term: null,
        honorific: null,
        gender: null,
        civilStatus: null,
        nationality: null,
        memberRegistrationDate: null,
        tin: null,
        atcCode: null,
        landline: null,
      },
    ]);

    const result = await service.findOptions({
      companyId: 11,
      query: { detail: 'complete' },
    });

    expect(prisma.party.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: PartyInclude,
      }),
    );
    expect(result[0]).toEqual(
      expect.objectContaining({
        cashAdvanceLimit: '1500.5',
        cashAdvanceBalance: '1500.5',
      }),
    );
  });

  it('rejects an unsupported party type before querying the database', async () => {
    await expect(
      service.findOptions({
        companyId: 11,
        query: { partyType: 'unsupported' },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.party.findMany).not.toHaveBeenCalled();
  });
});
