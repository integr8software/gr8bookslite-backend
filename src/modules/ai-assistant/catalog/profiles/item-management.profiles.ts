import { defineAiModuleProfiles } from './profile.helpers';

export const ItemManagementProfiles = defineAiModuleProfiles([
  {
    moduleCode: 'PM',
    name: 'Party Management',
    area: 'Party Management',
    aliases: ['parties', 'customers and suppliers', 'vendors and employees'],
    summary: 'Maintains customers, suppliers, vendors, members, employees, and other business parties.',
  },
  {
    moduleCode: 'I',
    name: 'Items',
    area: 'Item Management',
    aliases: ['item master', 'inventory items'],
    summary: 'Maintains the master records for goods and inventory items used by the company.',
  },
  {
    moduleCode: 'IB',
    name: 'Item Bundles',
    area: 'Item Management',
    aliases: ['item bundle', 'bundled items'],
    summary: 'Maintains groups of items that are offered or processed together as a bundle.',
  },
  {
    moduleCode: 'IC',
    name: 'Item Category',
    area: 'Item Management',
    aliases: ['item categories', 'category hierarchy'],
    summary: 'Maintains item categories and their hierarchy for organizing item records.',
  },
  {
    moduleCode: 'IV',
    name: 'Item Variations',
    area: 'Item Management',
    aliases: ['item variation', 'item variants', 'variant values'],
    summary: 'Maintains variations and variant values used to distinguish item options.',
  },
  {
    moduleCode: 'UOM',
    name: 'Unit of Measurement',
    area: 'Item Management',
    aliases: ['units of measurement', 'UOM', 'unit measures'],
    summary: 'Maintains the units used to measure, purchase, sell, and track items.',
  },
  {
    moduleCode: 'IPR',
    name: 'Item Promotions',
    area: 'Item Management',
    aliases: ['item promotion', 'promotion rules'],
    summary: 'Maintains promotional definitions and rules that apply to supported item transactions.',
  },
  {
    moduleCode: 'PLS',
    name: 'Item Price List',
    area: 'Item Management',
    aliases: ['item price lists', 'price list', 'item pricing'],
    summary: 'Maintains reusable item prices and price lists for supported sales workflows.',
  },
  {
    moduleCode: 'TT',
    name: 'Inventory Transaction Type',
    area: 'Item Management',
    aliases: ['inventory transaction types', 'stock transaction type'],
    summary: 'Maintains classifications used to identify supported inventory movements.',
  },
]);
