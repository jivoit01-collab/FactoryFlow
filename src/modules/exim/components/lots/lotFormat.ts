/**
 * The small rules and read-outs the oil lot screens share: which lot a Retain
 * hands a difference back to, how a shortage is worked out, how long a contract
 * has left, and how a line of a lot's history reads.
 *
 * The rules mirror the backend's (`exim/services_lot.py`), so a dialog can say
 * what will happen before the server is asked; the server still decides.
 */
import { formatDay } from '@/shared/utils';

import type { Lot, LotBrief, LotChange, LotStatus } from '../../types';
import { daysUntil, fmtKg, fmtMoney } from '../../utils';
import { LOT_STATUS_LABEL } from '../lotStatus';

/** Where a lot can rest; dispatching from one makes it the parent. EXIM's STORAGE_STATUSES. */
export const STORAGE_STATUSES: LotStatus[] = [
  'IN_CONTRACT',
  'AT_REFINERY',
  'KANDLA_STORAGE',
  'MUNDRA_PORT',
  'IN_TANK',
  'OUT_SIDE_FACTORY',
];

/** Statuses at or past the factory gate: their date is when the lot came, not when it is due. */
export const ARRIVED_STATUSES: LotStatus[] = [
  'OUT_SIDE_FACTORY',
  'IN_TANK',
  'IN_WAREHOUSE',
  'COMPLETED',
];

/** The share of the loaded quantity a supplier may lose in transit before being debited. */
export const ALLOWED_SHORTAGE_SHARE = 0.0025;

/** A lot's quantity times its rate may not reach this (the total column holds no more). */
export const MAX_LOT_TOTAL = 1e10;

/**
 * The storage lot a Retain on a whole-lot move or an arrival hands the
 * difference back to. None when the lot is a storage lot itself, has no parent,
 * or its parent has been closed: then only Tolerate can work.
 */
export function retainTarget(lot: Lot, parent?: LotBrief | null): number | null {
  if (STORAGE_STATUSES.includes(lot.status)) return null;
  if (!lot.parent) return null;
  if (parent && parent.deleted) return null;
  return lot.parent;
}

/** What the backend records when a lot is weighed into the tank at less than it was loaded. */
export function shortagePreview(loadedKg: number, weighedKg: number, ratePerKg: number) {
  const loadMt = loadedKg / 1000;
  const shortageMt = (loadedKg - weighedKg) / 1000;
  const allowedMt = loadMt * ALLOWED_SHORTAGE_SHARE;
  const deductedMt = shortageMt > allowedMt ? shortageMt - allowedMt : 0;
  return { shortageMt, allowedMt, deductedMt, amount: deductedMt * ratePerKg * 1000 };
}

/** A contract's length and the days it has left; either is null without its dates. */
export function contractDays(start?: string | null, end?: string | null) {
  const toStart = daysUntil(start);
  const left = daysUntil(end);
  return {
    periodDays: toStart !== null && left !== null ? left - toStart : null,
    daysLeft: left,
  };
}

/** How far off a day is, in words: "Today", "Tomorrow", "In 4 days", "3 days ago". */
export function dayCountdown(days: number): string {
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days > 1) return `In ${days} days`;
  return `${Math.abs(days)} day${days === -1 ? '' : 's'} ago`;
}

/** A contract's days left, in words. */
export function contractLeft(days: number): string {
  if (days < 0) return `Expired ${Math.abs(days)} day${days === -1 ? '' : 's'} ago`;
  if (days === 0) return 'Ends today';
  if (days === 1) return 'Ends tomorrow';
  return `${days} days left`;
}

/** Kilograms as tonnes, to the kilo: `20.000`. */
export function kgToMt(kg?: string | number | null): number {
  return Number(kg ?? 0) / 1000;
}

/** A rate per kg as it was agreed, to the paisa or its tenth: `118.50`, `118.125`. */
export function fmtRate(value?: string | number | null): string {
  if (value === null || value === undefined || value === '') return '—';
  return Number(value).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  });
}

/** A big rupee figure short enough for a tile: `₹ 9.88 Cr`, `₹ 4.20 L`. */
export function fmtRupeesShort(value?: string | number | null): string {
  const n = Number(value ?? 0);
  const abs = Math.abs(n);
  if (abs >= 1e7) return `₹ ${(n / 1e7).toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr`;
  if (abs >= 1e5) return `₹ ${(n / 1e5).toLocaleString('en-IN', { maximumFractionDigits: 2 })} L`;
  return `₹ ${fmtMoney(n)}`;
}

/** No more decimal places than the server keeps: two on a kilogram figure, three on a rate. */
export function withinDecimals(value: string, places: number): boolean {
  const match = /\.(\d+)$/.exec(value.trim());
  return !match || match[1].length <= places;
}

export function mapUrl(location: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

// --- a lot's history ----------------------------------------------------------

const FIELD_LABELS: Record<string, string> = {
  status: 'Status',
  rate: 'Rate',
  quantity: 'Quantity',
  vehicle_number: 'Vehicle',
  location: 'Location',
  eta: 'ETA',
  __create__: 'First entered as',
};

export function fieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

/** One recorded value, as a person reads it. EXIM wrote an empty value as "None". */
export function changeValue(field: string, value: unknown): string {
  if (value === null || value === undefined) return '—';
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  if (!text || text.toLowerCase() === 'none') return '—';
  if (field === 'status') return LOT_STATUS_LABEL[text as LotStatus] ?? text.replace(/_/g, ' ');
  if (field === 'quantity') return `${fmtKg(text)} kg`;
  if (field === 'rate') return `₹ ${text} /kg`;
  if (field === 'eta') return formatDay(text);
  return text;
}

/** The first values a `__create__` line carries, in the tracked fields' order. */
export function createdValues(change: LotChange): { field: string; value: string }[] {
  const line = change.changed_fields.find((f) => f.field === '__create__');
  if (!line || !line.new || typeof line.new !== 'object') return [];
  return Object.entries(line.new as Record<string, unknown>)
    .map(([field, value]) => ({ field, value: changeValue(field, value) }))
    .filter((entry) => entry.value !== '—');
}

/**
 * When the lot last entered each status, from its history (newest first, as the
 * API sends it): the timeline dates its steps with this.
 */
export function statusDates(history: LotChange[]): Partial<Record<LotStatus, string>> {
  const dates: Partial<Record<LotStatus, string>> = {};
  for (const change of [...history].reverse()) {
    for (const line of change.changed_fields) {
      if (line.field === 'status' && typeof line.new === 'string') {
        dates[line.new as LotStatus] = change.timestamp;
      } else if (line.field === '__create__' && line.new && typeof line.new === 'object') {
        const status = (line.new as Record<string, unknown>).status;
        if (typeof status === 'string') dates[status as LotStatus] = change.timestamp;
      }
    }
  }
  return dates;
}

/** Everything a lot can be found by in the register's search box. */
export function lotSearchText(lot: Lot): string {
  return [
    `#${lot.id}`,
    lot.item_name,
    lot.item_code,
    LOT_STATUS_LABEL[lot.status],
    lot.vendor_name,
    lot.vendor_code,
    lot.vehicle_number,
    lot.transporter,
    lot.location,
    lot.rate,
    lot.quantity,
    lot.eta ?? '',
    lot.arrival_date ?? '',
    lot.eta ? formatDay(lot.eta) : '',
    lot.arrival_date ? formatDay(lot.arrival_date) : '',
  ]
    .join(' ')
    .toLowerCase();
}
