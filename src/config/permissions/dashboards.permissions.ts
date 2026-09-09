export const DASHBOARDS_PERMISSIONS = {
  VIEW_STOCK_DASHBOARD: 'stock_dashboard.can_view_stock_dashboard',
  VIEW_NON_MOVING_RM: 'non_moving_rm.can_view_non_moving_rm',
  VIEW_SALES_PLANNING_REQUIREMENT:
    'sales_planning_requirement.can_view_sales_planning_requirement',
  REFRESH_SALES_PLANNING_REQUIREMENT:
    'sales_planning_requirement.can_refresh_sales_planning_requirement',
  VIEW_PRODUCTION_MOVEMENT: 'production_execution.can_view_reports',
  VIEW_DISPATCH_PLANS: 'dispatch_plans.can_view_dispatch_plans',
  EDIT_DISPATCH_PLANS: 'dispatch_plans.can_edit_dispatch_plans',
  VIEW_DISPATCH_PIPELINE: 'dispatch_plans.can_view_dispatch_pipeline',
  // Factory Expense wall board. Reading the wall and deciding what it counts
  // are deliberately separate rights.
  VIEW_FACTORY_EXPENSE: 'factory_expense.can_view_factory_expense',
  CONFIGURE_FACTORY_EXPENSE: 'factory_expense.can_configure_factory_expense',
  VIEW_BUDGET_APPROVALS: 'budget_approvals.can_view_budget_approvals',
} as const;

export type DashboardsPermission =
  (typeof DASHBOARDS_PERMISSIONS)[keyof typeof DASHBOARDS_PERMISSIONS];
