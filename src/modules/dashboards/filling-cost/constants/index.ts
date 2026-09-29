import { EXECUTION_PERMISSIONS } from '@/config/permissions';

/**
 * Who sees Beverages' filling cost on the production board: whoever may read
 * or keep the sheet. It only reads the saved sheets back, so it has no
 * permission of its own.
 */
export const FILLING_COST_BOARD_VIEW_PERMISSIONS = [
  EXECUTION_PERMISSIONS.VIEW_FILLING_COST,
  EXECUTION_PERMISSIONS.MANAGE_FILLING_COST,
];

/** Where the sheets are entered, for the panel's "Sheet" link. */
export const FILLING_COST_SHEET_ROUTE = '/production/execution/filling-cost';
