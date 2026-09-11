import { PartyClassification, PartyStatus, PartyType, Prisma } from '@prisma/client';
import { mapParty, mapPartyAddress } from './party-maintenance.mapper';
import type { PartyWithDetails } from '../types/party-with-details.type';
import { SystemGeneratedAuditLabel } from '../../../../common/utils/audit-user.util';

describe('party-maintenance.mapper', () => {
  const baseParty: PartyWithDetails = {
    id: 101n,
    companyId: 1,
    termId: 10n,
    partyEntityTypeId: 2n,
    defaultResponsibilityCenterId: 3n,
    defaultPaymentTypeId: 4n,
    defaultBank: 'BDO',
    defaultBankAccountNo: '1234567890',
    partyCodeNo: 'VEN-0001',
    classification: PartyClassification.NON_INDIVIDUAL,
    partyTypes: [PartyType.VENDOR],
    status: PartyStatus.ACTIVE,
    partyName: 'Acme Supplies Inc.',
    tradeName: 'Acme',
    firstName: null,
    middleName: null,
    lastName: null,
    suffixName: null,
    honorific: null,
    gender: null,
    civilStatus: null,
    nationality: null,
    memberRegistrationDate: null,
    defaultReceivableAccountId: null,
    customerAdvanceAccountId: null,
    defaultPayableAccountId: 201n,
    vendorAdvanceAccountId: 202n,
    purchaseType: ['Goods', 'Services'] as unknown as Prisma.JsonValue,
    employeeAdvanceAccountId: null,
    employeePayableAccountId: null,
    cashAdvanceLimit: null,
    tin: '123-456-789-000',
    atcCode: 'WC100',
    defaultPurchaseInputVatTaxSourceKey: 'TAX-IN-VAT-12',
    defaultPurchaseEwtTaxSourceKey: 'TAX-EWT-1',
    defaultPurchaseFwtTaxSourceKey: null,
    defaultPurchaseWvatTaxSourceKey: null,
    defaultSalesOutputVatTaxSourceKey: null,
    defaultSalesCwtTaxSourceKey: null,
    defaultSalesWvatTaxSourceKey: null,
    contactPerson: 'John Doe',
    email: 'john@acme.com',
    contactNo: '09171234567',
    landline: '0281234567',
    createdByUserId: 1,
    updatedByUserId: 2,
    deletedAt: null,
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
    updatedAt: new Date('2026-09-02T00:00:00.000Z'),
    partyEntityType: {
      id: 2n,
      name: 'Corporation',
      code: 'CORP',
      classification: PartyClassification.NON_INDIVIDUAL,
      isGovernment: false,
      status: PartyStatus.ACTIVE,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: null,
    },
    term: {
      id: 10n,
      companyId: 1,
      name: '30 Days',
      code: '30D',
      numberOfDays: 30,
      description: null,
      status: PartyStatus.ACTIVE,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: null,
      deletedAt: null,
      createdByUserId: 1,
      updatedByUserId: null,
    },
    defaultResponsibilityCenter: {
      id: 3n,
      companyId: 1,
      name: 'Head Office',
      code: 'HO',
      description: null,
      status: PartyStatus.ACTIVE,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: null,
      deletedAt: null,
      createdByUserId: 1,
      updatedByUserId: null,
    },
    defaultPaymentType: {
      id: 4n,
      companyId: 1,
      name: 'Check',
      code: 'CHK',
      description: null,
      status: PartyStatus.ACTIVE,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: null,
      deletedAt: null,
      createdByUserId: 1,
      updatedByUserId: null,
    },
    defaultReceivableAccount: null,
    customerAdvanceAccount: null,
    defaultPayableAccount: {
      id: 201n,
      accountCode: '2010',
      accountTitle: 'Accounts Payable',
    } as unknown as PartyWithDetails['defaultPayableAccount'],
    vendorAdvanceAccount: {
      id: 202n,
      accountCode: '1050',
      accountTitle: 'Advances to Suppliers',
    } as unknown as PartyWithDetails['vendorAdvanceAccount'],
    employeeAdvanceAccount: null,
    employeePayableAccount: null,
    addresses: [
      {
        id: 501n,
        partyId: 101n,
        addressName: 'Main Office',
        addressLine1: '123 Ayala Ave',
        addressLine2: 'Suite 400',
        barangay: 'San Lorenzo',
        barangayCode: '137604001',
        cityMunicipality: 'Makati',
        cityMunicipalityCode: '137604',
        province: 'NCR, Fourth District',
        provinceCode: '1376',
        region: 'National Capital Region (NCR)',
        regionCode: '130000000',
        isBilling: true,
        isBuilding: false,
        isDefault: true,
        isDelivery: false,
        isForeign: false,
        isHome: false,
      },
    ],
  };

  it('maps party model to party response DTO format', () => {
    const userNames = new Map([
      [1, 'Admin User'],
      [2, 'Editor User'],
    ]);

    const result = mapParty(baseParty, userNames);

    expect(result.id).toBe('101');
    expect(result.partyCodeNo).toBe('VEN-0001');
    expect(result.partyName).toBe('Acme Supplies Inc.');
    expect(result.partyEntityType).toBe('Corporation');
    expect(result.purchaseType).toEqual(['Goods', 'Services']);
    expect(result.createdBy).toBe('Admin User');
    expect(result.updatedBy).toBe('Editor User');
    expect(result.accountingAccounts.defaultPayableAccount).toEqual({
      id: '201',
      accountCode: '2010',
      accountTitle: 'Accounts Payable',
    });
    expect(result.accountingAccounts.defaultReceivableAccount).toBeNull();
    expect(result.address.addressName).toBe('Main Office');
  });

  it('handles system generated audit label when createdByUserId is null', () => {
    const partyWithNoAudit: PartyWithDetails = {
      ...baseParty,
      createdByUserId: null,
      updatedByUserId: null,
      addresses: [],
    };

    const result = mapParty(partyWithNoAudit, new Map());

    expect(result.createdBy).toBe(SystemGeneratedAuditLabel);
    expect(result.updatedBy).toBeNull();
    expect(result.address.addressName).toBe('Default Address');
  });

  it('correctly maps party address', () => {
    const address = baseParty.addresses[0];
    const mapped = mapPartyAddress(address);

    expect(mapped.id).toBe('501');
    expect(mapped.addressName).toBe('Main Office');
    expect(mapped.addressLine1).toBe('123 Ayala Ave');
    expect(mapped.barangay).toBe('San Lorenzo');
    expect(mapped.cityMunicipality).toBe('Makati');
    expect(mapped.isDefault).toBe(true);
    expect(mapped.isBilling).toBe(true);
  });
});
