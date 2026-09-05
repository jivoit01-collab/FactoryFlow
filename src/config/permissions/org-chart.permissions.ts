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

/** Anything that should reveal the chart page. */
export const ORG_CHART_ACCESS: readonly string[] = [
  ORG_CHART_PERMISSIONS.VIEW,
  ORG_CHART_PERMISSIONS.MANAGE,
];

export type OrgChartPermission = (typeof ORG_CHART_PERMISSIONS)[keyof typeof ORG_CHART_PERMISSIONS];
