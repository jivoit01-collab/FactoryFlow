export const DASHBOARDS_MODULE_PREFIX = 'sap_plan_dashboard';

export const DASHBOARDS_PERMISSIONS = {
  VIEW_PLAN_DASHBOARD: 'sap_plan_dashboard.can_view_plan_dashboard',
  EXPORT_PLAN_DASHBOARD: 'sap_plan_dashboard.can_export_plan_dashboard',
  VIEW_STOCK_DASHBOARD: 'stock_dashboard.can_view_stock_dashboard',
  VIEW_INVENTORY_AGE: 'inventory_age.can_view_inventory_age',
  VIEW_NON_MOVING_RM: 'non_moving_rm.can_view_non_moving_rm',
  VIEW_SALES_PLANNING_REQUIREMENT:
    'sales_planning_requirement.can_view_sales_planning_requirement',
  REFRESH_SALES_PLANNING_REQUIREMENT:
    'sales_planning_requirement.can_refresh_sales_planning_requirement',
  VIEW_PRODUCTION_MOVEMENT: 'production_execution.can_view_reports',
  VIEW_DISPATCH_PLANS: 'dispatch_plans.can_view_dispatch_plans',
  EDIT_DISPATCH_PLANS: 'dispatch_plans.can_edit_dispatch_plans',
  VIEW_DISPATCH_PIPELINE: 'dispatch_plans.can_view_dispatch_pipeline',
} as const;

export type DashboardsPermission =
  (typeof DASHBOARDS_PERMISSIONS)[keyof typeof DASHBOARDS_PERMISSIONS];
