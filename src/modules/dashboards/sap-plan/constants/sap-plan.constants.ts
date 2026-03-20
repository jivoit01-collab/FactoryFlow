import type { StatusColorConfig } from '@/config/constants/status.constants';

import type { ProductionOrderStatus, StockStatus } from '../types';

// ============================================================================
// Production Order Status
// ============================================================================

export const ORDER_STATUS_LABELS: Record<ProductionOrderStatus, string> = {
  planned: 'Planned',
  released: 'Released',
};

export const ORDER_STATUS_COLORS: Record<ProductionOrderStatus, StatusColorConfig> = {
  planned: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    darkBg: 'dark:bg-blue-900/30',
    darkText: 'dark:text-blue-400',
  },
  released: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    darkBg: 'dark:bg-green-900/30',
    darkText: 'dark:text-green-400',
  },
};

// ============================================================================
// Stock Status
// ============================================================================

export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  sufficient: 'Sufficient',
  partial: 'Partial',
  stockout: 'Stockout',
};

export const STOCK_STATUS_COLORS: Record<StockStatus, StatusColorConfig> = {
  sufficient: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    darkBg: 'dark:bg-green-900/30',
    darkText: 'dark:text-green-400',
  },
  partial: {
    bg: 'bg-amber-100',
    text: 'text-amber-800',
    darkBg: 'dark:bg-amber-900/30',
    darkText: 'dark:text-amber-400',
  },
  stockout: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    darkBg: 'dark:bg-red-900/30',
    darkText: 'dark:text-red-400',
  },
};

// ============================================================================
// Filter Options
// ============================================================================

export const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'planned', label: 'Planned' },
  { value: 'released', label: 'Released' },
] as const;

// ============================================================================
// Query Config
// ============================================================================

export const SAP_PLAN_STALE_TIME = 5 * 60 * 1000; // 5 minutes — SAP data fetched live
