import { getDefaultDateRange } from '@/shared/utils';

import type { DispatchFulfilmentFilters, DispatchMeasure } from '../types';

/** Matches the other dispatch dashboards (60s). */
export const DISPATCH_FULFILMENT_STALE_TIME = 60_000;

export function createDefaultFulfilmentFilters(): DispatchFulfilmentFilters {
  const { from, to } = getDefaultDateRange();
  return { from, to };
}

export interface MeasureOption {
  key: DispatchMeasure;
  label: string;
  short: string;
  /** unit suffix for quantity measures; empty for currency */
  unit: string;
}

export const MEASURE_OPTIONS: readonly MeasureOption[] = [
  { key: 'weight', label: 'Weight (kg)', short: 'Weight', unit: 'kg' },
  { key: 'litres', label: 'Litres', short: 'Litres', unit: 'L' },
  { key: 'boxes', label: 'Boxes', short: 'Boxes', unit: '' },
] as const;

// Categorical series colours — from the validated dataviz palette
// (blue / aqua / yellow; CVD-separated). Assigned in a fixed order.
export const SERIES_COLORS = {
  planned: '#2a78d6', // blue — the target
  dispatched: '#1baf7a', // aqua/green — what actually shipped
  billed: '#eda100', // yellow — the invoice value
} as const;

// Status pill colours for the plan backlog.
export const STATUS_COLORS: Record<string, string> = {
  DISPATCHED: '#1baf7a',
  BOOKED: '#2a78d6',
  PENDING: '#eda100',
  CANCELLED: '#e34948',
};

// Bill-list status tabs. Empty key = All.
export const BILL_STATUS_TABS: readonly { key: string; label: string; countKey: string }[] = [
  { key: '', label: 'All', countKey: 'ALL' },
  { key: 'PENDING', label: 'Pending', countKey: 'PENDING' },
  { key: 'BOOKED', label: 'Booked', countKey: 'BOOKED' },
  { key: 'DISPATCHED', label: 'Dispatched', countKey: 'DISPATCHED' },
  { key: 'CANCELLED', label: 'Cancelled', countKey: 'CANCELLED' },
] as const;

export const BILL_PAGE_SIZE = 25;
