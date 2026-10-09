/**
 * The report added up: SAP's quantities turned into boxes, litres, tons and
 * pallets, per SKU over the range (Items) and per SKU per day (Summary).
 *
 * The server sends one quantity per day and item; everything on the page and
 * in the Excel export is worked out here from that, so the two sheets and the
 * exported workbook can never disagree.
 *
 * The units are the workbook's ("Production & Dispatch- PALLET"):
 *
 *     Box    = quantity / pieces per box
 *     Liter  = quantity x litres per unit
 *     Ton    = litres x density / 1000     (net oil)
 *     PALLET = litres / pallet litres
 *
 * Every figure counts only customers outside the group: what went to Jivo Mart
 * and the other group companies is carried alongside as `groupDispatch`, so
 * the page can say how much it left out, and is never added in.
 */

import { NOT_SET } from '../constants';
import type { ProductionDispatchReport, ReportDay, ReportItem, ReportSettings } from '../types';

export interface Measure {
  /** SAP's own unit: pieces, tins, sets. */
  qty: number;
  box: number;
  litres: number;
  ton: number;
  pallet: number;
}

export const NO_MEASURE: Measure = { qty: 0, box: 0, litres: 0, ton: 0, pallet: 0 };

export function measure(qty: number, item: ReportItem, settings: ReportSettings): Measure {
  const litres = qty * item.litres_per_unit;
  return {
    qty,
    box: qty / (item.pieces_per_box || 1),
    litres,
    ton: (litres * settings.oil_density) / 1000,
    pallet: litres / settings.pallet_litres,
  };
}

export function addMeasure(a: Measure, b: Measure): Measure {
  return {
    qty: a.qty + b.qty,
    box: a.box + b.box,
    litres: a.litres + b.litres,
    ton: a.ton + b.ton,
    pallet: a.pallet + b.pallet,
  };
}

/** What one SKU did over the range, or on one day. */
export interface Totals {
  production: Measure;
  dispatch: Measure;
  /** To group companies: reported, never counted. */
  groupDispatch: Measure;
}

export function emptyTotals(): Totals {
  return { production: NO_MEASURE, dispatch: NO_MEASURE, groupDispatch: NO_MEASURE };
}

function totalsOf(day: ReportDay, item: ReportItem, settings: ReportSettings): Totals {
  return {
    production: measure(day.production, item, settings),
    dispatch: measure(day.dispatch, item, settings),
    groupDispatch: measure(day.group_dispatch, item, settings),
  };
}

function addTotals(a: Totals, b: Totals): Totals {
  return {
    production: addMeasure(a.production, b.production),
    dispatch: addMeasure(a.dispatch, b.dispatch),
    groupDispatch: addMeasure(a.groupDispatch, b.groupDispatch),
  };
}

export function sumTotals(rows: Totals[]): Totals {
  return rows.reduce<Totals>((sum, row) => addTotals(sum, row), emptyTotals());
}

/** Production pallets less dispatch pallets: stock built up (+) or drawn down (-). */
export function netPallet(totals: Pick<Totals, 'production' | 'dispatch'>): number {
  return totals.production.pallet - totals.dispatch.pallet;
}

/** Dispatch / Production, or null with nothing produced. Over 1 = more left than was made. */
export function dispatchShare(totals: Pick<Totals, 'production' | 'dispatch'>): number | null {
  return totals.production.pallet > 0 ? totals.dispatch.pallet / totals.production.pallet : null;
}

/** Produced or dispatched (to outside customers): the workbook's "activity". */
export function isActive(row: Pick<Totals, 'production' | 'dispatch'>): boolean {
  return row.production.qty + row.dispatch.qty > 0;
}

/** Anything moved at all, a group company's purchase included. */
function moved(row: Totals): boolean {
  return isActive(row) || row.groupDispatch.qty > 0;
}

export function packingTypeOf(item: ReportItem): string {
  return item.packing_type ?? NOT_SET;
}

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

function utc(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function addDays(iso: string, days: number): string {
  const date = utc(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Days from `from` to `to`, both counted. */
export function daysInRange(from: string, to: string): number {
  return Math.round((utc(to).getTime() - utc(from).getTime()) / 86_400_000) + 1;
}

/** The range in months, for the monthly averages: days over the report's month. */
export function monthsInRange(
  report: Pick<ProductionDispatchReport, 'from' | 'to' | 'settings'>,
): number {
  return daysInRange(report.from, report.to) / report.settings.month_days;
}

// ---------------------------------------------------------------------------
// The two sheets
// ---------------------------------------------------------------------------

export interface ItemRow extends Totals {
  item: ReportItem;
}

export interface DayItemRow extends ItemRow {
  date: string;
}

/**
 * Summary: one row per SKU per day it moved, by date and then item code. A day
 * on which a SKU was neither made nor sold has no row -- the range would
 * otherwise be every SKU times every day, almost all of it zeros.
 */
export function dayItemRows(report: ProductionDispatchReport): DayItemRow[] {
  const items = new Map(report.items.map((item) => [item.item_code, item]));
  const rows: DayItemRow[] = [];
  for (const day of report.days) {
    const item = items.get(day.item_code);
    if (!item) continue;
    const totals = totalsOf(day, item, report.settings);
    if (moved(totals)) rows.push({ date: day.date, item, ...totals });
  }
  return rows.sort(
    (a, b) => a.date.localeCompare(b.date) || a.item.item_code.localeCompare(b.item.item_code),
  );
}

/** Items: each SKU's days added up over the range, in item-code order. */
export function itemRows(days: DayItemRow[]): ItemRow[] {
  const byCode = new Map<string, ItemRow>();
  for (const day of days) {
    const sofar = byCode.get(day.item.item_code);
    byCode.set(day.item.item_code, {
      item: day.item,
      ...addTotals(sofar ?? emptyTotals(), day),
    });
  }
  return [...byCode.values()].sort((a, b) => a.item.item_code.localeCompare(b.item.item_code));
}
