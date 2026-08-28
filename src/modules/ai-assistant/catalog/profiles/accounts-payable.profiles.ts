import { defineAiModuleProfiles } from './profile.helpers';

export const AccountsPayableProfiles = defineAiModuleProfiles([
  {
    moduleCode: 'APV',
    name: 'Accounts Payable Voucher',
    area: 'Accounts Payable',
    aliases: ['AP voucher', 'payables voucher', 'supplier payable voucher'],
    summary: 'Records and tracks obligations payable to suppliers before payment.',
  },
]);
