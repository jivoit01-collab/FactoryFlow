/**
 * Department Ownership Chart Permissions
 *
 * These map 1:1 to the custom Django permissions on `org_chart.OrgChartPermission`.
 * Reading is meant to be broad — the chart's whole purpose is telling anyone whom
 * to ask — while editing who owns a function stays with whoever maintains it.
 */

export const ORG_CHART_PERMISSIONS = {
  /** Open the chart */
  VIEW: 'org_chart.can_view_org_chart',
  /** Edit it: departments, functions, and the people at each level */
  MANAGE: 'org_chart.can_manage_org_chart',
} as const;

export const ORG_CHART_MODULE_PREFIX = 'org_chart';

/**
 * What it takes to open the chart page: nothing beyond being signed in. Every
 * user may read the chart, and the backend's read check is open the same way.
 * Editing is still `can_manage_org_chart`, which the page learns from the API's
 * `can_manage` flag rather than from this list.
 *
 * An empty list passes both the route guard and the sidebar filter.
 * `VIEW` is still defined because the Django groups still carry it, but it
 * no longer decides anything.
 */
export const ORG_CHART_ACCESS: readonly string[] = [];

export type OrgChartPermission = (typeof ORG_CHART_PERMISSIONS)[keyof typeof ORG_CHART_PERMISSIONS];
