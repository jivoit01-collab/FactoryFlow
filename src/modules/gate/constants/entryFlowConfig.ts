import { ENTRY_TYPES } from '@/config/constants';

export interface EntryFlowConfig {
  entryType: string;
  routePrefix: string;
  headerTitle: string;
  totalSteps: number;
  dashboardTitle: string;
  dashboardDescription: string;
  allPageTitle: string;
  allPageDescription: string;
}

export const RAW_MATERIAL_FLOW: EntryFlowConfig = {
  entryType: ENTRY_TYPES.RAW_MATERIAL,
  routePrefix: '/gate/raw-materials',
  headerTitle: 'Material Inward',
  totalSteps: 6,
  dashboardTitle: 'Raw Materials (RM/PM/Assets)',
  dashboardDescription: 'Manage raw materials, packing materials, and assets gate entries',
  allPageTitle: 'Raw Materials (RM/PM/Assets)',
  allPageDescription: 'Manage raw materials, packing materials, and assets gate entries',
};

export const CONSTRUCTION_FLOW: EntryFlowConfig = {
  entryType: ENTRY_TYPES.CONSTRUCTION,
  routePrefix: '/gate/construction',
  headerTitle: 'Construction Entry',
  totalSteps: 4,
  dashboardTitle: 'Construction (Civil/Building Work)',
  dashboardDescription: 'Manage construction materials and building work gate entries',
  allPageTitle: 'Construction (Civil/Building Work)',
  allPageDescription: 'Manage construction materials and building work gate entries',
};

export const DAILY_NEED_FLOW: EntryFlowConfig = {
  entryType: ENTRY_TYPES.DAILY_NEED,
  routePrefix: '/gate/daily-needs',
  headerTitle: 'Daily Needs Entry',
  totalSteps: 4,
  dashboardTitle: 'Daily Needs (Food/Consumables)',
  dashboardDescription: 'Manage daily needs, food, and consumables gate entries',
  allPageTitle: 'Daily Needs (Food/Consumables)',
  allPageDescription: 'Manage daily needs, food, and consumables gate entries',
};

export const MAINTENANCE_FLOW: EntryFlowConfig = {
  entryType: ENTRY_TYPES.MAINTENANCE,
  routePrefix: '/gate/maintenance',
  headerTitle: 'Maintenance Entry',
  totalSteps: 4,
  dashboardTitle: 'Maintenance (Spare parts/Tools)',
  dashboardDescription: 'Manage maintenance items, spare parts, and tools gate entries',
  allPageTitle: 'Maintenance (Spare parts/Tools)',
  allPageDescription: 'Manage maintenance items, spare parts, and tools gate entries',
};
