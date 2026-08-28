import { AccountsPayableProfiles } from './profiles/accounts-payable.profiles';
import { CashDisbursementProfiles } from './profiles/cash-disbursement.profiles';
import { CashReceiptProfiles } from './profiles/cash-receipt.profiles';
import { DeliveryVehicleManagementProfiles } from './profiles/delivery-vehicle-management.profiles';
import { FinancialMaintenanceProfiles } from './profiles/financial-maintenance.profiles';
import { GeneralJournalProfiles } from './profiles/general-journal.profiles';
import { InventoryProfiles } from './profiles/inventory.profiles';
import { ItemManagementProfiles } from './profiles/item-management.profiles';
import { OtherProfiles } from './profiles/other.profiles';
import { PurchasingProfiles } from './profiles/purchasing.profiles';
import { SalesProfiles } from './profiles/sales.profiles';
import { SystemAdministrationProfiles } from './profiles/system-administration.profiles';
import { WarehouseManagementProfiles } from './profiles/warehouse-management.profiles';
import { AiModuleProfile } from './ai-module-profile.types';

export const AiModuleProfiles: readonly AiModuleProfile[] = [
  ...OtherProfiles,
  ...FinancialMaintenanceProfiles,
  ...ItemManagementProfiles,
  ...WarehouseManagementProfiles,
  ...DeliveryVehicleManagementProfiles,
  ...CashReceiptProfiles,
  ...CashDisbursementProfiles,
  ...AccountsPayableProfiles,
  ...GeneralJournalProfiles,
  ...SalesProfiles,
  ...InventoryProfiles,
  ...PurchasingProfiles,
  ...SystemAdministrationProfiles,
];

const profilesByCode = new Map(AiModuleProfiles.map((profile) => [profile.moduleCode, profile]));
const searchableProfiles = AiModuleProfiles.flatMap((profile) =>
  profile.aliases.map((alias) => ({
    alias: normalizeSearchText(alias),
    profile,
  })),
).sort((left, right) => right.alias.length - left.alias.length);

export function findAiModuleProfileByCode(moduleCode: string) {
  return profilesByCode.get(moduleCode.toUpperCase());
}

export function findAiModuleProfile(message: string) {
  const normalizedMessage = ` ${normalizeSearchText(message)} `;

  return searchableProfiles.find(({ alias }) => normalizedMessage.includes(` ${alias} `))?.profile;
}

export function getAiModulePromptProfiles(moduleCodes?: ReadonlySet<string>) {
  return AiModuleProfiles.filter((profile) => !moduleCodes || moduleCodes.has(profile.moduleCode)).map((profile) => ({
    moduleCode: profile.moduleCode,
    name: profile.name,
    area: profile.area,
    aliases: profile.aliases,
    summary: profile.summary,
    tools: profile.tools,
  }));
}

export function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
