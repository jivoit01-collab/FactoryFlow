/**
 * The arithmetic the Oil Prices and Jivo Rates screens share: the four figures a
 * commodity is quoted in, days as `YYYY-MM-DD`, a day's change, a range's high
 * and low, the colours the trend lines are drawn in, and the order the sheet
 * lays Jivo's packs and commodities out in.
 *
 * Days are read as local dates throughout: `new Date('2026-09-24')` is UTC
 * midnight, which is the evening before here.
 */
import type { PriceFigures } from '../../types';
import { fmtMoney } from '../../utils';

// ---------------------------------------------------------------------------
// The four figures
// ---------------------------------------------------------------------------

export type PriceFigure = keyof PriceFigures;

export interface FigureDef {
  key: PriceFigure;
  /** "With GST, per litre": the words, without the unit. */
  label: string;
  unit: '₹/kg' | '₹/L';
  per: 'kg' | 'L';
}

/** In the order the sheet builds them up: factory, + packing, + GST, per litre. */
export const FIGURES: FigureDef[] = [
  { key: 'factory_price_kg', label: 'Factory', unit: '₹/kg', per: 'kg' },
  { key: 'packed_price_kg', label: 'With packing', unit: '₹/kg', per: 'kg' },
  { key: 'with_gst_kg', label: 'With GST', unit: '₹/kg', per: 'kg' },
  { key: 'with_gst_litre', label: 'With GST, per litre', unit: '₹/L', per: 'L' },
];

/** The figure a URL names, or the factory price. */
export function figureOf(key: string | null | undefined): FigureDef {
  return FIGURES.find((f) => f.key === key) ?? FIGURES[0];
}

// ---------------------------------------------------------------------------
// Days
// ---------------------------------------------------------------------------

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** A `YYYY-MM-DD` as a local date, or null. */
export function parseDay(iso: string | null | undefined): Date | null {
  const match = DAY.exec((iso ?? '').slice(0, 10));
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Whether a URL value is a real day, `2026-02-30` not being one. */
export function isDay(value: string | null | undefined): value is string {
  const date = parseDay(value);
  return !!date && toISO(date) === value;
}

export function toISO(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function addDays(iso: string, days: number): string {
  const date = parseDay(iso);
  if (!date) return iso;
  date.setDate(date.getDate() + days);
  return toISO(date);
}

/** Whole days from `from` to `to`: 0 for the same day. */
export function daysBetween(from: string, to: string): number {
  const a = parseDay(from);
  const b = parseDay(to);
  if (!a || !b) return 0;
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/** `30 September 2026`. */
export function longDay(iso: string | null | undefined): string {
  const date = parseDay(iso);
  return date
    ? date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—';
}

/** `30 Sep`, for a chart's axis. */
export function shortDay(iso: string): string {
  const date = parseDay(iso);
  return date ? date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : iso;
}

/** `Wed 30 Sep 2026`, for a tooltip or a row of a day-by-day table. */
export function tooltipDay(iso: string): string {
  const date = parseDay(iso);
  return date
    ? date.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : iso;
}

// ---------------------------------------------------------------------------
// Ranges
// ---------------------------------------------------------------------------

export const QUICK_RANGES = [7, 30, 90] as const;
export const DEFAULT_RANGE_DAYS = 30;

/** The server refuses a longer range: the trends are read in one go. */
export const MAX_RANGE_DAYS = 400;

/** `days` days ending on `to`, both ends counted. */
export function rangeEnding(to: string, days: number): { from: string; to: string } {
  return { from: addDays(to, -(days - 1)), to };
}

/** What is wrong with a range, in words, or null. */
export function rangeProblem(from: string, to: string): string | null {
  if (!parseDay(from) || !parseDay(to)) return 'Pick both days.';
  if (from > to) return 'The range starts after it ends.';
  if (daysBetween(from, to) > MAX_RANGE_DAYS) return `Pick at most ${MAX_RANGE_DAYS} days.`;
  return null;
}

// ---------------------------------------------------------------------------
// A change, day on day or over a range
// ---------------------------------------------------------------------------

export type Direction = 'up' | 'down' | 'same';

export interface Change {
  /** Rupees, signed. */
  amount: number;
  /** Of the earlier figure; null when that was nothing. */
  pct: number | null;
  direction: Direction;
}

/** Below half a paisa a figure has not moved: the sheet quotes to the paisa. */
const STILL = 0.005;

/** How `current` moved from `previous`; null when there was no `previous`. */
export function changeOf(current: number, previous: number | null | undefined): Change | null {
  if (previous === null || previous === undefined || !Number.isFinite(previous)) return null;
  const raw = current - previous;
  if (Math.abs(raw) < STILL) return { amount: 0, pct: 0, direction: 'same' };
  return {
    amount: raw,
    pct: previous !== 0 ? (raw / previous) * 100 : null,
    direction: raw > 0 ? 'up' : 'down',
  };
}

export interface Tally {
  up: number;
  down: number;
  same: number;
  /** New that day: nothing the day before to compare with. */
  fresh: number;
}

export function tally(changes: (Change | null)[]): Tally {
  const counts: Tally = { up: 0, down: 0, same: 0, fresh: 0 };
  for (const change of changes) {
    if (!change) counts.fresh += 1;
    else counts[change.direction] += 1;
  }
  return counts;
}

// ---------------------------------------------------------------------------
// A range's figures, per series
// ---------------------------------------------------------------------------

/** One figure of one series (a commodity) on one day. */
export interface Point {
  date: string;
  key: string;
  value: number;
}

export interface DayValue {
  date: string;
  value: number;
}

export interface SeriesStats {
  key: string;
  /** Days the series was quoted in the range. */
  days: number;
  first: DayValue;
  last: DayValue;
  /** The first day it stood at its highest. */
  high: DayValue;
  low: DayValue;
  /** Last against first. */
  change: Change | null;
}

/** Each series' first, last, highest and lowest over the points given. */
export function statsOf(points: Point[]): Map<string, SeriesStats> {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const stats = new Map<string, SeriesStats>();
  for (const p of sorted) {
    const day = { date: p.date, value: p.value };
    const found = stats.get(p.key);
    if (!found) {
      stats.set(p.key, {
        key: p.key,
        days: 1,
        first: day,
        last: day,
        high: day,
        low: day,
        change: null,
      });
      continue;
    }
    found.days += 1;
    found.last = day;
    if (p.value > found.high.value) found.high = day;
    if (p.value < found.low.value) found.low = day;
  }
  for (const s of stats.values()) {
    s.change = s.days > 1 ? changeOf(s.last.value, s.first.value) : null;
  }
  return stats;
}

/** A row per day, a figure per series: what the chart draws and the day-by-day table lists. */
export type DayRow = { date: string } & Record<string, number | string | null>;

/**
 * The points as a row per day. `slot` maps a series to the field it is drawn
 * from: a chart reads `a.b` as a path, so a name with a dot in it cannot be one.
 */
export function rowsByDay(points: Point[], slot: (key: string) => string | undefined): DayRow[] {
  const byDate = new Map<string, DayRow>();
  for (const p of points) {
    const field = slot(p.key);
    if (!field) continue;
    let row = byDate.get(p.date);
    if (!row) {
      row = { date: p.date };
      byDate.set(p.date, row);
    }
    row[field] = p.value;
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

// ---------------------------------------------------------------------------
// Series colours
// ---------------------------------------------------------------------------

/**
 * Eight hues in a fixed order, checked for colour-blind separation between
 * neighbours; the dark column is the same hues stepped for the dark surface.
 * A series keeps its hue whatever else is drawn: it follows the series' place
 * in the whole list, never its place among those switched on.
 */
const SERIES_LIGHT = [
  '#2a78d6',
  '#eb6834',
  '#1baf7a',
  '#eda100',
  '#e87ba4',
  '#008300',
  '#4a3aa7',
  '#e34948',
];
const SERIES_DARK = [
  '#3987e5',
  '#d95926',
  '#199e70',
  '#c98500',
  '#d55181',
  '#008300',
  '#9085e9',
  '#e66767',
];

export interface SeriesStyle {
  color: string;
  /** Past the eighth series the hues come round again, dashed, then dotted. */
  dash?: string;
}

export function seriesStyle(index: number, dark: boolean): SeriesStyle {
  const palette = dark ? SERIES_DARK : SERIES_LIGHT;
  const color = palette[index % palette.length];
  if (index >= palette.length * 2) return { color, dash: '2 3' };
  if (index >= palette.length) return { color, dash: '6 4' };
  return { color };
}

export interface SeriesDef extends SeriesStyle {
  key: string;
  label: string;
  /** The field of a `DayRow` the series is drawn from. */
  slot: string;
}

/** Series for each name, in the order given, each with its colour and field. */
export function seriesFor(names: string[], dark: boolean): SeriesDef[] {
  return names.map((name, index) => ({
    key: name,
    label: name,
    slot: `s${index}`,
    ...seriesStyle(index, dark),
  }));
}

// ---------------------------------------------------------------------------
// The order the sheet lays things out in
// ---------------------------------------------------------------------------

/** `Pouch 750 Gm` → `pouch750gm`: names compared without case, spaces or dots. */
function squash(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function byKnownOrder(known: string[]) {
  return (a: string, b: string) => {
    const ai = known.indexOf(squash(a));
    const bi = known.indexOf(squash(b));
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  };
}

/** EXIM's order: the pouches, the bottle, then the tins, largest first. */
const PACK_ORDER = [
  'pouch1ltr',
  'pouch750gm',
  'pouch750g',
  'pouch700gm',
  'pouch700g',
  'bottle1ltr',
  '15ltrtin',
  '15kgtin',
  '13kgtin',
];

/** As the sheet heads its "JIVO RATE" columns. */
const RATE_COMMODITY_ORDER = ['soya', 'mustard', 'sunflower', 'cottonrefined', 'ricebranrefined'];

export function orderPacks(packs: string[]): string[] {
  return [...new Set(packs)].sort(byKnownOrder(PACK_ORDER));
}

export function orderRateCommodities(commodities: string[]): string[] {
  return [...new Set(commodities)].sort(byKnownOrder(RATE_COMMODITY_ORDER));
}

/** The pack the trends start on: the litre pouch, Jivo's biggest seller. */
export function defaultPack(packs: string[]): string | undefined {
  return packs.find((p) => squash(p) === 'pouch1ltr') ?? packs[0];
}

/**
 * The commodities the price trends start with: the five Jivo packs, as the
 * price sheet names them. Any of them missing, the first few instead.
 */
const JIVO_OILS = [
  'soyarefined',
  'mustardkachighani',
  'sunflower',
  'cottonseed',
  'ricebranrefined',
];

export function defaultCommodities(commodities: string[]): string[] {
  const picked = commodities.filter((c) => JIVO_OILS.includes(squash(c)));
  return picked.length ? picked : commodities.slice(0, 4);
}

// ---------------------------------------------------------------------------
// Words and figures
// ---------------------------------------------------------------------------

/** `₹ 1,234.50`. */
export function fmtRupees(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : `₹ ${fmtMoney(value)}`;
}

/** `+2.00`, `−1.50`, `0.00`: a true minus sign, so the column lines up. */
export function fmtSigned(value: number): string {
  if (value === 0) return fmtMoney(0);
  return `${value > 0 ? '+' : '−'}${fmtMoney(Math.abs(value))}`;
}

/** `+1.4%`, `−0.3%`. */
export function fmtPct(value: number | null | undefined): string {
  if (value === null || value === undefined) return '';
  if (Math.abs(value) < 0.05) return '0.0%';
  return `${value > 0 ? '+' : '−'}${Math.abs(value).toFixed(1)}%`;
}

/** `₹150` on an axis: whole rupees, grouped. */
export function axisRupees(value: number): string {
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n.toLocaleString('en-IN')} ${n === 1 ? one : many}`;
}

/**
 * The purchase team's sheet, as published: what the server reads every night.
 * The pages link to the server's own `sheet_url` (it follows
 * EXIM_PRICE_SHEET_URL); this is EXIM's link, used until a day has loaded.
 */
export const PRICE_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vR2LwtfXKkkDiVzOc_T591-4KWwUvKW-ZaJokeixIzHkOyHNSjGv5Ilh3597ZgaMA/pubhtml?gid=655973128&single=true';
