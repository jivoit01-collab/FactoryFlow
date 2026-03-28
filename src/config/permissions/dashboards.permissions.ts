export const DASHBOARDS_MODULE_PREFIX = 'sap_plan_dashboard';

export const DASHBOARDS_PERMISSIONS = {
  VIEW_PLAN_DASHBOARD: 'sap_plan_dashboard.can_view_plan_dashboard',
  EXPORT_PLAN_DASHBOARD: 'sap_plan_dashboard.can_export_plan_dashboard',
  VIEW_STOCK_DASHBOARD: 'stock_dashboard.can_view_stock_dashboard',
  VIEW_INVENTORY_AGE: 'inventory_age.can_view_inventory_age',
  VIEW_NON_MOVING_RM: 'non_moving_rm.can_view_non_moving_rm',
} as const;

export type DashboardsPermission =
  (typeof DASHBOARDS_PERMISSIONS)[keyof typeof DASHBOARDS_PERMISSIONS];
