import { AiModuleTools } from '../ai-module-profile.types';
import { defineAiModuleProfiles } from './profile.helpers';

export const FinancialMaintenanceProfiles = defineAiModuleProfiles([
  {
    moduleCode: 'COA',
    name: 'Chart of Accounts',
    area: 'Financial Maintenance',
    aliases: ['charts of accounts', 'COA', 'account codes', 'accounts list'],
    summary: 'Maintains the account codes and names used for accounting entries and financial reporting.',
  },
  {
    moduleCode: 'DA',
    name: 'Default Accounts',
    area: 'Financial Maintenance',
    aliases: ['default account', 'account defaults'],
    summary: 'Maintains reusable default account mappings used by supported business processes.',
  },
  {
    moduleCode: 'BM',
    name: 'Bank Masterfile',
    area: 'Financial Maintenance',
    aliases: ['bank master', 'bank accounts'],
    summary: 'Maintains company bank records and their related accounting setup.',
  },
  {
    moduleCode: 'SM',
    name: 'Services Maintenance',
    area: 'Financial Maintenance',
    aliases: ['service maintenance', 'services setup'],
    summary: 'Maintains services that the company provides and their related accounting setup.',
  },
  {
    moduleCode: 'DSM',
    name: 'Discount Maintenance',
    area: 'Financial Maintenance',
    aliases: ['discount setup', 'discount rules'],
    summary: 'Maintains reusable discount definitions for supported sales and purchasing workflows.',
  },
  {
    moduleCode: 'TM',
    name: 'Terms Maintenance',
    area: 'Financial Maintenance',
    aliases: ['payment terms', 'collection terms', 'due terms', 'datemode'],
    knowledgeLevel: 'detailed',
    summary: 'Maintains payment and collection terms, including the date mode, period, and active status.',
    tools: [
      AiModuleTools.EXPLAIN,
      AiModuleTools.OPEN,
      AiModuleTools.TERMS_SEARCH,
      AiModuleTools.TERMS_FILTER,
      AiModuleTools.TERMS_PREPARE,
      AiModuleTools.TERMS_UPDATE_PREVIEW,
    ],
  },
  {
    moduleCode: 'PT',
    name: 'Payment Type',
    area: 'Financial Maintenance',
    aliases: ['payment types', 'payment method setup'],
    summary: 'Maintains payment methods and classifications used by supported payment workflows.',
  },
  {
    moduleCode: 'RC',
    name: 'Responsibility Center',
    area: 'Financial Maintenance',
    aliases: ['responsibility centers', 'accountability center'],
    summary: 'Maintains responsibility centers used to organize accountability and financial reporting.',
  },
]);
