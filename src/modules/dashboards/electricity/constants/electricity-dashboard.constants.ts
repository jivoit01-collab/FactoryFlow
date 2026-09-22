import { COMPANY_CODES } from '@/config/constants';
import { DAILY_ELECTRICITY_ACCESS_PERMISSIONS } from '@/config/permissions';

/**
 * Who may open the board. Deliberately the daily register's own access set
 * rather than a permission of its own: this page only reads readings back, so
 * anyone allowed to see one is allowed to see their roll-up.
 */
export const ELECTRICITY_BOARD_VIEW_PERMISSIONS = DAILY_ELECTRICITY_ACCESS_PERMISSIONS;

/**
 * The campus supply feeds the Oil and Beverages plants; Jivo Mart is not on it
 * and has no meter in the master, so the board is hidden there rather than
 * offered as an empty page.
 */
export const ELECTRICITY_BOARD_COMPANIES = [
  COMPANY_CODES.JIVO_OIL,
  COMPANY_CODES.JIVO_BEVERAGES,
] as const;
