import { DASHBOARDS_PERMISSIONS } from '@/config/permissions';

import type { StockCategoryKey } from '../types';

/** The board's own right; nothing else opens it. See amounts_board/permissions.py. */
export const AMOUNTS_BOARD_VIEW_PERMISSIONS: readonly string[] = [
  DASHBOARDS_PERMISSIONS.VIEW_AMOUNTS_BOARD,
];

export const AMOUNTS_OWNERS_PERMISSIONS: readonly string[] = [
  DASHBOARDS_PERMISSIONS.MANAGE_STOCK_OWNERS,
];

/** The first poll; after that the server's `meta.refresh_seconds` decides. */
export const AMOUNTS_BOARD_REFRESH_MS = 300_000;

/** The two plant rows, top to bottom -- drawn even before the board arrives. */
export const AMOUNTS_PLANTS = [
  { code: 'JIVO_OIL', label: 'Oil plant' },
  { code: 'JIVO_BEVERAGES', label: 'Beverage plant' },
] as const;

export const STOCK_CATEGORIES: readonly StockCategoryKey[] = ['RM', 'PM', 'FG'];

export const STOCK_CATEGORY_LABELS: Record<StockCategoryKey, string> = {
  RM: 'Raw Material',
  PM: 'Packing Material',
  FG: 'Finished Goods',
};

/** The debtor tiles, left to right, before the Total. */
export const DEBTOR_TILES = [
  { key: 'JWPL', label: 'JWPL' },
  { key: 'MART', label: 'MART' },
  { key: 'BEVERAGES', label: 'Beverages' },
] as const;

export const AMOUNTS_OWNERS_ROUTE = '/dashboards/amounts/owners';
export const NON_MOVING_ROUTE = '/dashboards/non-moving';
