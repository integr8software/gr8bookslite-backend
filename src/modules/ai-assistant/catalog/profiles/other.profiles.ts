import { defineAiModuleProfiles } from './profile.helpers';

export const OtherProfiles = defineAiModuleProfiles([
  {
    moduleCode: 'DO',
    name: 'Dashboard',
    area: 'Dashboard',
    aliases: ['company dashboard', 'overview dashboard'],
    summary: 'Shows company activity, approvals, and available performance information in one overview.',
  },
  {
    moduleCode: 'FA',
    name: 'Fixed Asset',
    area: 'Others',
    aliases: ['fixed assets', 'asset records'],
    summary: 'Tracks supported fixed asset records and related activity.',
  },
  {
    moduleCode: 'BBU',
    name: 'Beginning Balance Uploader',
    area: 'Others',
    aliases: ['beginning balances', 'opening balance uploader', 'upload opening balances'],
    summary: 'Uploads and reviews opening balances used to initialize supported accounting records.',
  },
]);
