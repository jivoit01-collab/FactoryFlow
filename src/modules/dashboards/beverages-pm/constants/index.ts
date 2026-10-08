import { COMPANY_CODES } from '@/config/constants';
import { DASHBOARDS_PERMISSIONS } from '@/config/permissions';

/**
 * The page reads whichever company the header names, and Beverages is the one
 * it was built for. Withheld elsewhere so it is not mistaken for a second copy
 * of the Packing Material board.
 */
export const BEVERAGES_PM_COMPANIES = [COMPANY_CODES.JIVO_BEVERAGES] as const;

/** Same right as the Packing Material board, which reads the same tables. */
export const BEVERAGES_PM_VIEW_PERMISSIONS = [DASHBOARDS_PERMISSIONS.VIEW_PACKING_MATERIAL] as const;

/** A live stock snapshot over three HANA reads; it does not move minute to minute. */
export const BEVERAGES_PM_STALE_TIME = 5 * 60 * 1000;

/** The family the backend files an item with no `U_Sub_Group` under. */
export const NO_FAMILY = '(no family)';
