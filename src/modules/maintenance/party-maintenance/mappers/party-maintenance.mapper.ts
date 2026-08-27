import type { ChartAccount, PartyAddress } from '@prisma/client';
import { SystemGeneratedAuditLabel } from '../../../../common/utils/audit-user.util';
import type { PartyWithDetails } from '../types/party-with-details.type';

export function mapParty(party: PartyWithDetails, userNames: Map<number, string>) {
  const taxDefaults = party as PartyWithDetails & PartyTaxDefaultSourceKeys;

  return {
    id: party.id.toString(),
    partyCodeNo: party.partyCodeNo,
    classification: party.classification,
    partyEntityType: party.partyEntityType?.name ?? null,
    partyTypes: party.partyTypes,
    status: party.status,
    partyName: party.partyName ?? '',
    tradeName: party.tradeName ?? '',
    firstName: party.firstName ?? '',
    middleName: party.middleName ?? '',
    lastName: party.lastName ?? '',
    suffixName: party.suffixName ?? '',
    honorific: party.honorific ?? '',
    gender: party.gender ?? '',
    civilStatus: party.civilStatus ?? '',
    nationality: party.nationality ?? '',
    memberRegistrationDate: party.memberRegistrationDate?.toISOString().slice(0, 10) ?? '',
    address: mapPartyAddress(getDefaultPartyAddress(party.addresses)),
    addresses: party.addresses.map(mapPartyAddress),
    defaultReceivableAccount: party.defaultReceivableAccountId?.toString() ?? '',
    customerAdvanceAccount: party.customerAdvanceAccountId?.toString() ?? '',
    defaultPayableAccount: party.defaultPayableAccountId?.toString() ?? '',
    vendorAdvanceAccount: party.vendorAdvanceAccountId?.toString() ?? '',
    employeeAdvanceAccount: party.employeeAdvanceAccountId?.toString() ?? '',
    employeePayableAccount: party.employeePayableAccountId?.toString() ?? '',
    cashAdvanceLimit: party.cashAdvanceLimit?.toString() ?? '',
    accountingAccounts: {
      defaultReceivableAccount: mapChartAccountSummary(party.defaultReceivableAccount),
      customerAdvanceAccount: mapChartAccountSummary(party.customerAdvanceAccount),
      defaultPayableAccount: mapChartAccountSummary(party.defaultPayableAccount),
      vendorAdvanceAccount: mapChartAccountSummary(party.vendorAdvanceAccount),
      employeeAdvanceAccount: mapChartAccountSummary(party.employeeAdvanceAccount),
      employeePayableAccount: mapChartAccountSummary(party.employeePayableAccount),
    },
    termId: party.termId?.toString() ?? '',
    termName: party.term?.name ?? '',
    tin: party.tin ?? '',
    atcCode: party.atcCode ?? '',
    defaultPurchaseInputVatTaxSourceKey: taxDefaults.defaultPurchaseInputVatTaxSourceKey ?? '',
    defaultPurchaseEwtTaxSourceKey: taxDefaults.defaultPurchaseEwtTaxSourceKey ?? '',
    defaultPurchaseFwtTaxSourceKey: taxDefaults.defaultPurchaseFwtTaxSourceKey ?? '',
    defaultPurchaseWvatTaxSourceKey: taxDefaults.defaultPurchaseWvatTaxSourceKey ?? '',
    defaultSalesOutputVatTaxSourceKey: taxDefaults.defaultSalesOutputVatTaxSourceKey ?? '',
    defaultSalesCwtTaxSourceKey: taxDefaults.defaultSalesCwtTaxSourceKey ?? '',
    defaultSalesWvatTaxSourceKey: taxDefaults.defaultSalesWvatTaxSourceKey ?? '',
    contactPerson: party.contactPerson ?? '',
    email: party.email ?? '',
    contactNo: party.contactNo ?? '',
    landline: party.landline ?? '',
    createdBy: party.createdByUserId === null ? SystemGeneratedAuditLabel : (userNames.get(party.createdByUserId) ?? null),
    createdAt: party.createdAt,
    updatedBy: (party.updatedByUserId && userNames.get(party.updatedByUserId)) ?? null,
    updatedAt: party.updatedAt,
  };
}

type PartyTaxDefaultSourceKeys = {
  defaultPurchaseInputVatTaxSourceKey?: string | null;
  defaultPurchaseEwtTaxSourceKey?: string | null;
  defaultPurchaseFwtTaxSourceKey?: string | null;
  defaultPurchaseWvatTaxSourceKey?: string | null;
  defaultSalesOutputVatTaxSourceKey?: string | null;
  defaultSalesCwtTaxSourceKey?: string | null;
  defaultSalesWvatTaxSourceKey?: string | null;
};

function mapChartAccountSummary(account: ChartAccount | null) {
  return account
    ? {
        id: account.id.toString(),
        accountCode: account.accountCode,
        accountTitle: account.accountTitle,
      }
    : null;
}

function getDefaultPartyAddress(addresses: PartyAddress[]) {
  return (
    addresses.find((address) => address.isDefault) ??
    addresses[0] ?? {
      id: 0n,
      partyId: 0n,
      addressName: 'Default Address',
      addressLine1: '',
      addressLine2: '',
      barangay: '',
      barangayCode: '',
      cityMunicipality: '',
      cityMunicipalityCode: '',
      province: '',
      provinceCode: '',
      region: '',
      regionCode: '',
      isBilling: false,
      isBuilding: false,
      isDefault: true,
      isDelivery: false,
      isForeign: false,
      isHome: false,
    }
  );
}

export function mapPartyAddress(address: PartyAddress) {
  return {
    id: address.id.toString(),
    addressName: address.addressName,
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2,
    barangay: address.barangay ?? '',
    barangayCode: address.barangayCode ?? '',
    cityMunicipality: address.cityMunicipality ?? '',
    cityMunicipalityCode: address.cityMunicipalityCode ?? '',
    isBilling: address.isBilling,
    isBuilding: address.isBuilding,
    isDefault: address.isDefault,
    isDelivery: address.isDelivery,
    isForeign: address.isForeign,
    isHome: address.isHome,
    province: address.province ?? '',
    provinceCode: address.provinceCode ?? '',
    region: address.region ?? '',
    regionCode: address.regionCode ?? '',
  };
}
