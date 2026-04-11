/** Stale time for warehouse queries (5 minutes) */
export const WAREHOUSE_STALE_TIME = 5 * 60 * 1000;

/** SAP transaction type labels */
export const TRANS_TYPE_LABELS: Record<number, string> = {
  13: 'A/R Invoice',
  14: 'A/R Credit Memo',
  15: 'Delivery',
  16: 'Returns',
  18: 'A/P Invoice',
  19: 'A/P Credit Memo',
  20: 'Purchase Delivery',
  21: 'Purchase Returns',
  59: 'Goods Receipt',
  60: 'Goods Issue',
  67: 'Inventory Transfer',
  69: 'Inventory Revaluation',
  162: 'Inventory Posting',
  202: 'Production Order',
};
