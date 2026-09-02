import { defineAiModuleProfiles } from './profile.helpers';

export const DeliveryVehicleManagementProfiles = defineAiModuleProfiles([
  {
    moduleCode: 'DVE',
    name: 'Delivery Vehicles',
    area: 'Delivery Vehicle Management',
    aliases: ['delivery vehicle', 'vehicle master'],
    summary: 'Maintains delivery vehicle records, assignments, capacities, registration, and status.',
  },
  {
    moduleCode: 'DVT',
    name: 'Vehicle Types',
    area: 'Delivery Vehicle Management',
    aliases: ['vehicle type', 'delivery vehicle types'],
    summary: 'Maintains vehicle type definitions, capacity defaults, and handling information.',
  },
  {
    moduleCode: 'DVMR',
    name: 'Vehicle Repair and Maintenance',
    area: 'Delivery Vehicle Management',
    aliases: ['vehicle maintenance', 'vehicle repair', 'fleet maintenance'],
    summary: 'Tracks vehicle inspections, defects, maintenance requests, repairs, and service history.',
  },
]);
