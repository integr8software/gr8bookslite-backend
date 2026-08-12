import { NotFoundException } from '@nestjs/common';
import { PartyClassification, PartyStatus, PartyType } from '@prisma/client';
import { PartyMaintenanceService } from './party-maintenance.service';

describe('PartyMaintenanceService party ownership', () => {
  function createService() {
    const prisma = {
      party: {
        findFirst: jest.fn(),
      },
    };

    return { prisma, service: new PartyMaintenanceService(prisma as never, {} as never) };
  }

  it('resolves a party only inside the active company', async () => {
    const { prisma, service } = createService();
    const party = {
      id: 51n,
      companyId: 11,
      partyCodeNo: 'CUS-00051',
      classification: PartyClassification.NON_INDIVIDUAL,
      partyTypes: [PartyType.CUSTOMER],
      partyName: 'Acme Retail Corporation',
      status: PartyStatus.ACTIVE,
      deletedAt: null,
    };
    prisma.party.findFirst.mockResolvedValue(party);

    await expect(callPrivate(service, 'findPartyOrThrow', 11, 51n)).resolves.toBe(party);
    expect(prisma.party.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 51n, companyId: 11, deletedAt: null },
      }),
    );
  });

  it('rejects a party outside the active company catalog', async () => {
    const { prisma, service } = createService();
    prisma.party.findFirst.mockResolvedValue(null);

    await expect(callPrivate(service, 'findPartyOrThrow', 11, 99n)).rejects.toThrow(NotFoundException);
  });
});

function callPrivate(service: PartyMaintenanceService, methodName: string, ...args: unknown[]) {
  return (service as never as Record<string, (...values: unknown[]) => Promise<unknown>>)[methodName](...args);
}
