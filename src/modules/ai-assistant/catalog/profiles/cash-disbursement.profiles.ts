import { defineAiModuleProfiles } from './profile.helpers';

export const CashDisbursementProfiles = defineAiModuleProfiles([
  {
    moduleCode: 'CV',
    name: 'Cash Voucher',
    area: 'Cash Disbursement',
    aliases: ['cash vouchers'],
    summary: 'Prepares and tracks supported cash payment voucher transactions.',
  },
  {
    moduleCode: 'DV',
    name: 'Disbursement Voucher',
    area: 'Cash Disbursement',
    aliases: ['disbursement vouchers', 'payment voucher'],
    summary: 'Prepares and tracks vouchers for supported company disbursements and payments.',
  },
  {
    moduleCode: 'CA',
    name: 'Cash Advance',
    area: 'Cash Disbursement',
    aliases: ['cash advances', 'employee advance', 'multiple cash advance', 'cash advance multiple', 'cash advance multiple entry'],
    summary: 'Records and tracks cash advances issued for supported company activities, including multiple entries.',
  },
  {
    moduleCode: 'PCV',
    name: 'Petty Cash Voucher',
    area: 'Cash Disbursement',
    aliases: ['petty cash vouchers', 'petty cash fund', 'petty cash funds'],
    summary: 'Records supported petty cash voucher activity and detail lines.',
  },
  {
    moduleCode: 'PCR',
    name: 'Petty Cash Replenishment',
    area: 'Cash Disbursement',
    aliases: ['petty cash replenishment', 'replenish petty cash'],
    summary: 'Prepares replenishment of a petty cash fund based on supported fund activity.',
  },
  {
    moduleCode: 'RF',
    name: 'Revolving Fund',
    area: 'Cash Disbursement',
    aliases: ['revolving funds'],
    summary: 'Maintains and tracks revolving fund activity and balances.',
  },
  {
    moduleCode: 'RFR',
    name: 'Revolving Fund Replenishment',
    area: 'Cash Disbursement',
    aliases: ['revolving fund replenishment', 'replenish revolving fund'],
    summary: 'Prepares replenishment of a revolving fund based on supported fund activity.',
  },
  {
    moduleCode: 'RFP',
    name: 'Request For Payment',
    area: 'Cash Disbursement',
    aliases: ['request for payments', 'payment request'],
    summary: 'Creates and tracks requests for company payment before disbursement processing.',
  },
  {
    moduleCode: 'ATS',
    name: 'Advances To Suppliers',
    area: 'Cash Disbursement',
    aliases: ['advances to supplier', 'supplier advances', 'advance to supplier'],
    summary: 'Records advances paid to suppliers before final billing or settlement.',
  },
  {
    moduleCode: 'RT',
    name: 'Recurring Transactions',
    area: 'Cash Disbursement',
    aliases: ['recurring transaction', 'recurring disbursement'],
    summary: 'Maintains recurring transaction definitions for supported repeat disbursements.',
  },
]);
