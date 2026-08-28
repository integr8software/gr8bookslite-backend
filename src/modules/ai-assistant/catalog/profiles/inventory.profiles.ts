import { defineAiModuleProfiles } from './profile.helpers';

export const InventoryProfiles = defineAiModuleProfiles([
  {
    moduleCode: 'RR',
    name: 'Receiving Report',
    area: 'Inventory',
    aliases: ['receiving reports', 'inventory receiving report'],
    summary: 'Records and reviews items received through supported purchasing and inventory workflows.',
  },
  {
    moduleCode: 'GR',
    name: 'Goods Receipt',
    area: 'Inventory',
    aliases: ['goods receipts', 'receive goods'],
    summary: 'Records goods received into inventory and their supported movement details.',
  },
  {
    moduleCode: 'INC',
    name: 'Inventory Count',
    area: 'Inventory',
    aliases: ['inventory counts', 'physical inventory count', 'stock count'],
    summary: 'Records and monitors physical counts of inventory stock.',
  },
  {
    moduleCode: 'MR',
    name: 'Material Request',
    area: 'Inventory',
    aliases: ['material requests', 'inventory request', 'stock request'],
    summary: 'Requests materials or items from available inventory for a department or activity.',
  },
  {
    moduleCode: 'PL',
    name: 'Pick List',
    area: 'Inventory',
    aliases: ['pick lists', 'inventory picking'],
    summary: 'Prepares the list of inventory items to be picked for a supported release or delivery.',
  },
  {
    moduleCode: 'GI',
    name: 'Goods Issue',
    area: 'Inventory',
    aliases: ['goods issues', 'issue goods'],
    summary: 'Records goods issued out of inventory and their supported movement details.',
  },
  {
    moduleCode: 'DR',
    name: 'Delivery Receipt',
    area: 'Inventory',
    aliases: ['delivery receipts', 'goods delivery receipt'],
    summary: 'Records goods delivered to a customer or receiving party.',
  },
]);
