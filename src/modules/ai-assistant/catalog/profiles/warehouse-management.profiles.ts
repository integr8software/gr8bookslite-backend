import { defineAiModuleProfiles } from './profile.helpers';

export const WarehouseManagementProfiles = defineAiModuleProfiles([
  {
    moduleCode: 'WM',
    name: 'Warehouses',
    area: 'Warehouse Management',
    aliases: ['warehouse management', 'warehouse master'],
    summary: 'Maintains warehouse master records used to store and manage inventory.',
  },
  {
    moduleCode: 'WA',
    name: 'Warehouse Access',
    area: 'Warehouse Management',
    aliases: ['warehouse permissions', 'warehouse user access'],
    summary: 'Controls which users may access supported warehouse records and operations.',
  },
  {
    moduleCode: 'WS',
    name: 'Warehouse Storage',
    area: 'Warehouse Management',
    aliases: ['warehouse locations', 'storage layout'],
    summary: 'Maintains warehouse storage locations, layout, capacity, and availability setup.',
  },
  {
    moduleCode: 'WSI',
    name: 'Warehouse Inventory Stock',
    area: 'Warehouse Management',
    aliases: ['warehouse stock', 'inventory stock', 'stock availability'],
    summary: 'Shows inventory quantities, availability, and movements by warehouse and storage location.',
  },
  {
    moduleCode: 'WT',
    name: 'Warehouse Inventory Transfer',
    area: 'Warehouse Management',
    aliases: ['warehouse transfer', 'inventory transfer', 'stock transfer'],
    summary: 'Records inventory transfers between supported warehouses or storage locations.',
  },
]);
