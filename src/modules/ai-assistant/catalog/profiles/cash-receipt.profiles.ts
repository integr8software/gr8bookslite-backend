import { defineAiModuleProfiles } from './profile.helpers';

export const CashReceiptProfiles = defineAiModuleProfiles([
  {
    moduleCode: 'OR',
    name: 'Official Receipt',
    area: 'Cash Receipt',
    aliases: ['official receipts', 'customer official receipt'],
    summary: 'Records official receipts for supported customer payment and collection workflows.',
  },
  {
    moduleCode: 'CR',
    name: 'Collection Receipt',
    area: 'Cash Receipt',
    aliases: ['collection receipts', 'customer collection'],
    summary: 'Records collections received from customers and their supported payment details.',
  },
  {
    moduleCode: 'AR',
    name: 'Acknowledgement Receipt',
    area: 'Cash Receipt',
    aliases: ['acknowledgment receipt', 'acknowledgement receipts'],
    summary: 'Acknowledges money or items received before or outside an official receipt workflow.',
  },
  {
    moduleCode: 'PVR',
    name: 'Provisional Receipt',
    area: 'Cash Receipt',
    aliases: ['provisional receipts', 'temporary receipt'],
    summary: 'Records temporary receipts that are pending final confirmation or official processing.',
  },
  {
    moduleCode: 'BR',
    name: 'Bank Reconciliation',
    area: 'Cash Receipt',
    aliases: ['reconcile bank', 'bank matching'],
    summary: 'Matches company accounting records against bank transactions and balances.',
  },
  {
    moduleCode: 'PDCW',
    name: 'Post Dated Check',
    area: 'Cash Receipt',
    aliases: ['post-dated check', 'post dated checks', 'PDC'],
    summary: 'Registers and monitors post-dated checks and their current processing status.',
  },
]);
