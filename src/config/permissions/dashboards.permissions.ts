export const DASHBOARDS_MODULE_PREFIX = 'sap_plan_dashboard';

export const DASHBOARDS_PERMISSIONS = {
  VIEW_PLAN_DASHBOARD: 'sap_plan_dashboard.can_view_plan_dashboard',
  EXPORT_PLAN_DASHBOARD: 'sap_plan_dashboard.can_export_plan_dashboard',
} as const;

export type DashboardsPermission =
  (typeof DASHBOARDS_PERMISSIONS)[keyof typeof DASHBOARDS_PERMISSIONS];
