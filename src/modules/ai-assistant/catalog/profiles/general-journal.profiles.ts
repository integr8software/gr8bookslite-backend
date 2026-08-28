import { defineAiModuleProfiles } from './profile.helpers';

export const GeneralJournalProfiles = defineAiModuleProfiles([
  {
    moduleCode: 'JV',
    name: 'Journal Voucher',
    area: 'General Journal',
    aliases: ['journal vouchers', 'manual journal entry'],
    summary: 'Records supported manual journal entries and accounting adjustments.',
  },
]);
