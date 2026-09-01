import { defineAiModuleProfiles } from './profile.helpers';

export const SystemAdministrationProfiles = defineAiModuleProfiles([
  {
    moduleCode: 'U',
    name: 'Users',
    area: 'System Administration',
    aliases: ['user management', 'system users'],
    summary: 'Creates and maintains user accounts and their supported access configuration.',
  },
  {
    moduleCode: 'UR',
    name: 'User Roles',
    area: 'System Administration',
    aliases: ['user role', 'roles and permissions'],
    summary: 'Maintains user role classifications and their supported permissions.',
  },
  {
    moduleCode: 'AM',
    name: 'Approval Management',
    area: 'System Administration',
    aliases: ['approver setup', 'approval setup', 'approval transactions'],
    summary: 'Configures supported approval workflows and provides access to approval transactions.',
  },
  {
    moduleCode: 'AT',
    name: 'Audit Trail',
    area: 'System Administration',
    aliases: ['audit logs', 'activity history'],
    summary: 'Reviews recorded user and system activity for supported operations.',
  },
  {
    moduleCode: 'TNS',
    name: 'Transaction Number Setup',
    area: 'System Administration',
    aliases: ['transaction numbering', 'number sequence setup'],
    summary: 'Configures numbering sequences used by supported transaction modules.',
  },
  {
    moduleCode: 'MCS',
    name: 'Multi Currency Setup',
    area: 'System Administration',
    aliases: ['multi-currency setup', 'currency setup', 'exchange rate setup'],
    summary: 'Configures supported currencies, exchange rates, preferences, and rounding rules.',
  },
  {
    moduleCode: 'FS',
    name: 'Form Signatory',
    area: 'System Administration',
    aliases: ['form signatories', 'authorized signatories'],
    summary: 'Maintains authorized signatories used by supported forms and official documents.',
  },
  {
    moduleCode: 'CRPT',
    name: 'Customize Report',
    area: 'System Administration',
    aliases: ['customized reports', 'custom report', 'report customization'],
    summary: 'Customizes supported report templates, fields, headers, footers, and signatories.',
  },
  {
    moduleCode: 'FM',
    name: 'Field Management',
    area: 'System Administration',
    aliases: ['manage fields', 'field configuration'],
    summary: 'Configures supported module fields and field requirements.',
  },
  {
    moduleCode: 'MM',
    name: 'Mail Maintenance',
    area: 'System Administration',
    aliases: ['mail setup', 'email configuration', 'mail server setup'],
    summary: 'Maintains supported mail server and notification settings.',
  },
]);
