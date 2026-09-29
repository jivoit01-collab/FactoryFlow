/**
 * The Oil Stock matrix, worked out from what the API sent: which columns show,
 * the oils in the shared order, where the group breaks fall, and the subtotal
 * under each group.
 *
 * Two orderings meet here. The ROW ORDER is shared: anybody allowed to change
 * it changes it for everybody. The GROUP BREAKS are the reader's own (EXIM kept
 * them in the browser). A break is written down as "under this oil", so it
 * stays between the same two groups however the rows are shuffled, and a break
 * under an oil the filters hide still splits the oils around it.
 */
import type { LotStatus, StockDashboard } from '../../types';
import { LOT_STATUS_LABEL } from '../lotStatus';
import { fromKg, fromLitres, num, type OilUnit } from './oilUnits';

export interface MatrixColumn {
  key: string;
  label: string;
  /** The API's "<STATUS>__<vendor>" keys this column adds up. */
  sourceKeys: string[];
}

export interface MatrixGroup {
  status: LotStatus;
  label: string;
  columns: MatrixColumn[];
  sourceKeys: string[];
}

/** Closed lots: EXIM kept them off the matrix unless a status filter asked for them. */
export const CLOSED_STATUSES: LotStatus[] = ['COMPLETED', 'DELIVERED'];

export function buildGroups(
  columns: StockDashboard['columns'],
  { showClosed, byVendor }: { showClosed: boolean; byVendor: boolean },
): MatrixGroup[] {
  return columns
    .filter((column) => showClosed || !CLOSED_STATUSES.includes(column.status))
    .map((column) => {
      const keys = column.vendors.map((vendor) => `${column.status}__${vendor}`);
      return {
        status: column.status,
        label: LOT_STATUS_LABEL[column.status] ?? column.label,
        sourceKeys: keys,
        columns: byVendor
          ? column.vendors.map((vendor, index) => ({
              key: keys[index],
              label: vendor,
              sourceKeys: [keys[index]],
            }))
          : [{ key: column.status, label: '', sourceKeys: keys }],
      };
    });
}

export interface MatrixOil {
  item: number;
  code: string;
  name: string;
  /** Litres in the tanks; 0 where the tanks are not on screen. */
  tankL: number;
  outsideKg: number;
  /** Kilograms, keyed "<STATUS>__<vendor>". */
  values: Record<string, number>;
}

export interface Sums {
  tankL: number;
  outsideKg: number;
  values: Record<string, number>;
}

export function sumKeys(values: Record<string, number>, keys: string[]): number {
  return keys.reduce((sum, key) => sum + num(values[key]), 0);
}

export function sumOils(oils: MatrixOil[], keys: string[]): Sums {
  const sums: Sums = { tankL: 0, outsideKg: 0, values: {} };
  for (const oil of oils) {
    sums.tankL += oil.tankL;
    sums.outsideKg += oil.outsideKg;
    for (const key of keys) sums.values[key] = (sums.values[key] ?? 0) + num(oil.values[key]);
  }
  return sums;
}

/** Everything a row (or a subtotal) holds, in the unit on screen. */
export function totalIn(unit: OilUnit, sums: Sums, keys: string[]): number {
  return fromLitres(sums.tankL, unit) + fromKg(sums.outsideKg + sumKeys(sums.values, keys), unit);
}

/** Only what the lots account for, not the tanks: the stock still coming in. */
export function pipelineIn(unit: OilUnit, sums: Sums, keys: string[]): number {
  return fromKg(sumKeys(sums.values, keys), unit);
}

export function hasStock(oil: MatrixOil, keys: string[]): boolean {
  return oil.tankL > 0 || oil.outsideKg > 0 || sumKeys(oil.values, keys) > 0;
}

/** The oils in the order given; any the order does not know go last, by code. */
export function orderOils<T extends { code: string }>(oils: T[], order: string[]): T[] {
  const rank = new Map(order.map((code, index) => [code, index]));
  return [...oils].sort((a, b) => {
    const ra = rank.get(a.code);
    const rb = rank.get(b.code);
    if (ra !== undefined && rb !== undefined) return ra - rb;
    if (ra !== undefined) return -1;
    if (rb !== undefined) return 1;
    return a.code.localeCompare(b.code);
  });
}

export type MatrixLine =
  | { kind: 'oil'; oil: MatrixOil; breakBelow: boolean }
  | {
      kind: 'subtotal';
      id: string;
      sums: Sums;
      /** The breaks this subtotal stands for (none for the last group's). */
      anchors: string[];
    };

/**
 * The rows on screen: each oil, and a subtotal under every group once the
 * breaks split the oils into more than one.
 *
 * `oils` are the ones on screen, already in order; `order` is the whole shared
 * order, hidden oils included, so a break under a hidden oil still counts.
 */
export function buildLines(
  oils: MatrixOil[],
  order: string[],
  breaks: string[],
  keys: string[],
): MatrixLine[] {
  const breakSet = new Set(breaks);
  const byCode = new Map(oils.map((oil) => [oil.code, oil]));
  const known = new Set(order);
  const sequence = [...order, ...oils.filter((oil) => !known.has(oil.code)).map((o) => o.code)];

  const lines: MatrixLine[] = [];
  let block: MatrixOil[] = [];
  let pending: string[] = [];
  let groups = 0;

  const close = (anchors: string[]) => {
    lines.push({
      kind: 'subtotal',
      id: `subtotal-${groups}`,
      sums: sumOils(block, keys),
      anchors,
    });
    groups += 1;
    block = [];
  };

  for (const code of sequence) {
    const oil = byCode.get(code);
    if (oil) {
      // A break above the first row on screen has nothing to subtotal: dropped.
      if (pending.length && block.length) close(pending);
      pending = [];
      lines.push({ kind: 'oil', oil, breakBelow: breakSet.has(code) });
      block.push(oil);
    }
    if (breakSet.has(code)) pending.push(code);
  }
  // The last group gets its subtotal too, once there is more than one group.
  if (groups > 0 && block.length) close(pending);
  return lines;
}

export type Placement = 'before' | 'after' | 'group-start';

/**
 * Move one oil next to another, in the shared order and among the breaks.
 *
 *  - "before" / "after": beside the target, in the target's group. Dropped
 *    under the last oil of a group, the oil joins that group, so the break
 *    under the group moves down to it.
 *  - "group-start": straight under the target's break, first of the next group.
 *
 * An oil that carried a break leaves it behind for the oil above it, so the
 * groups either side keep their break when one of their oils moves away.
 */
export function placeOil(
  order: string[],
  breaks: string[],
  code: string,
  target: string,
  where: Placement,
): { order: string[]; breaks: string[] } {
  if (code === target) return { order, breaks };
  const next = order.includes(code) ? [...order] : [...order, code];
  if (!next.includes(target)) next.push(target);
  let nextBreaks = [...breaks];

  const from = next.indexOf(code);
  if (nextBreaks.includes(code)) {
    nextBreaks = nextBreaks.filter((c) => c !== code);
    const above = next[from - 1];
    if (above && !nextBreaks.includes(above)) nextBreaks.push(above);
  }
  next.splice(from, 1);

  const at = next.indexOf(target);
  if (where === 'before') {
    next.splice(at, 0, code);
  } else {
    next.splice(at + 1, 0, code);
    if (where === 'after' && nextBreaks.includes(target)) {
      nextBreaks = [...nextBreaks.filter((c) => c !== target), code];
    }
  }
  return { order: next, breaks: nextBreaks };
}

/**
 * One step up or down among the rows on screen, crossing a break into the
 * group beyond it rather than jumping over the group's first or last oil.
 */
export function stepPlacement(
  lines: MatrixLine[],
  code: string,
  direction: 'up' | 'down',
): { target: string; where: Placement } | null {
  const index = lines.findIndex((line) => line.kind === 'oil' && line.oil.code === code);
  if (index < 0) return null;
  const step = direction === 'up' ? -1 : 1;
  let crossed = false;
  for (let i = index + step; i >= 0 && i < lines.length; i += step) {
    const line = lines[i];
    if (line.kind === 'subtotal') {
      crossed = true;
      continue;
    }
    const target = line.oil.code;
    if (direction === 'up') return { target, where: crossed ? 'after' : 'before' };
    return { target, where: crossed ? 'before' : 'after' };
  }
  return null;
}
