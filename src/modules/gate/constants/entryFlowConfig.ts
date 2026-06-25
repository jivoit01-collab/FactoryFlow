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
  totalSteps: 5,
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

export const FIXED_ASSET_FLOW: EntryFlowConfig = {
  entryType: ENTRY_TYPES.FIXED_ASSET,
  routePrefix: '/gate/fixed-assets',
  headerTitle: 'Fixed Asset Entry',
  totalSteps: 3,
  dashboardTitle: 'Fixed Assets',
  dashboardDescription: 'Manage fixed asset inward gate entries',
  allPageTitle: 'Fixed Assets',
  allPageDescription: 'Manage fixed asset inward gate entries',
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

export const BST_OUT_FLOW: EntryFlowConfig = {
  entryType: 'BST_OUT',
  routePrefix: '/gate/bst-out',
  headerTitle: 'BST Out',
  totalSteps: 3,
  dashboardTitle: 'BST Out',
  dashboardDescription: 'Manage branch stock transfer gate-out entries',
  allPageTitle: 'BST Out',
  allPageDescription: 'Manage branch stock transfer gate-out entries',
};

export const BST_IN_FLOW: EntryFlowConfig = {
  entryType: ENTRY_TYPES.BST_IN,
  routePrefix: '/gate/bst-in',
  headerTitle: 'BST In',
  totalSteps: 2,
  dashboardTitle: 'BST In',
  dashboardDescription: 'Receive in-transit branch stock transfer vehicles',
  allPageTitle: 'BST In',
  allPageDescription: 'Receive in-transit branch stock transfer vehicles',
};

export const BST_RETURN_FLOW: EntryFlowConfig = {
  entryType: ENTRY_TYPES.BST_RETURN,
  routePrefix: '/gate/bst-return',
  headerTitle: 'BST Return',
  totalSteps: 2,
  dashboardTitle: 'BST Return',
  dashboardDescription: 'Record BST vehicles that returned before destination BST in',
  allPageTitle: 'BST Return',
  allPageDescription: 'Record BST vehicles that returned before destination BST in',
};

export const JOB_WORK_FLOW: EntryFlowConfig = {
  entryType: ENTRY_TYPES.JOB_WORK,
  routePrefix: '/gate/job-work',
  headerTitle: 'Job Work',
  totalSteps: 3,
  dashboardTitle: 'Job Work',
  dashboardDescription: 'Record oil refining vehicle movement and link production orders later',
  allPageTitle: 'Job Work',
  allPageDescription: 'Manage job-work gate entries',
};
