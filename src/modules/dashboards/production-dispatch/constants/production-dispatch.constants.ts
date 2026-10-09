import { DASHBOARDS_PERMISSIONS } from '@/config/permissions';

/** The page's own right; nothing else opens it. See production_dispatch/permissions.py. */
export const PRODUCTION_DISPATCH_VIEW_PERMISSIONS: readonly string[] = [
  DASHBOARDS_PERMISSIONS.VIEW_PRODUCTION_DISPATCH,
];

export const PRODUCTION_DISPATCH_ROUTE = '/dashboards/production-dispatch';

/** The longest range the server reads at once (`MAX_RANGE_DAYS`). */
export const MAX_RANGE_DAYS = 366;

/** What a blank SAP field reads as -- never a guess. */
export const NOT_SET = 'Not set in SAP';
