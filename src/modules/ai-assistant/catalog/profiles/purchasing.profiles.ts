import { AiModuleTools } from '../ai-module-profile.types';
import { defineAiModuleProfiles } from './profile.helpers';

export const PurchasingProfiles = defineAiModuleProfiles([
  {
    moduleCode: 'PR',
    name: 'Purchase Request',
    area: 'Purchasing',
    aliases: ['purchase requests', 'purchasing request'],
    knowledgeLevel: 'detailed',
    summary: 'Starts a controlled request for goods or services before canvassing, ordering, and receiving.',
    tools: [AiModuleTools.EXPLAIN, AiModuleTools.OPEN, AiModuleTools.PURCHASE_REQUEST_PREPARE],
  },
  {
    moduleCode: 'CF',
    name: 'Canvass Form',
    area: 'Purchasing',
    aliases: ['canvass', 'supplier canvass', 'quotation comparison'],
    summary: 'Compares supplier quotations before selecting a supplier or preparing a purchase order.',
  },
  {
    moduleCode: 'PO',
    name: 'Purchase Order',
    area: 'Purchasing',
    aliases: ['purchase orders', 'supplier order'],
    summary: 'Records an approved order placed with a supplier for goods or services.',
  },
  {
    moduleCode: 'PJ',
    name: 'Purchase Journal',
    area: 'Purchasing',
    aliases: ['purchase journals'],
    summary: 'Reviews supported purchasing journal activity and related accounting entries.',
  },
]);
