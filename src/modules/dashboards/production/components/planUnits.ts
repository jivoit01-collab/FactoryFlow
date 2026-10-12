import { useState } from 'react';

import { decimal, whole } from '@/modules/dashboards/plant-board/components/drills/format';
import type { PlanSku } from '@/modules/dashboards/plant-board/types';

/** The units the month-plan popups switch between, shared so both read alike. */
export type Unit = 'tons' | 'litres' | 'cases' | 'pcs';

export const UNITS: { key: Unit; label: string }[] = [
  { key: 'tons', label: 'Tonnes' },
  { key: 'litres', label: 'Litres' },
  { key: 'cases', label: 'Cases' },
  { key: 'pcs', label: 'Pcs' },
];

const UNIT_STORAGE_KEY = 'month-plan-sku-unit';

function storedUnit(): Unit {
  try {
    const value = window.localStorage.getItem(UNIT_STORAGE_KEY);
    if (UNITS.some((unit) => unit.key === value)) return value as Unit;
  } catch {
    // Storage blocked: the default is fine.
  }
  return 'tons';
}

/** The chosen unit, remembered across visits where storage allows. */
export function usePlanUnit(): [Unit, (next: Unit) => void] {
  const [unit, setUnitState] = useState<Unit>(storedUnit);
  const setUnit = (next: Unit) => {
    setUnitState(next);
    try {
      window.localStorage.setItem(UNIT_STORAGE_KEY, next);
    } catch {
      // Remembered for this visit only.
    }
  };
  return [unit, setUnit];
}

/**
 * One figure of a row in the chosen unit, from its pieces and its tonnes.
 *
 * Litres are the tonnes on the board's own 1000 L = 1 t rule, the rule the
 * tonnes were made with. Null where the unit does not exist for the SKU: no
 * litre volume in SAP for tonnes and litres, no case factor on the plan for
 * cases. Null is "—", never a zero.
 */
export function amount(row: PlanSku, qty: number, tons: number, unit: Unit): number | null {
  if (unit === 'pcs') return qty;
  if (unit === 'cases') return row.pieces_per_case ? qty / row.pieces_per_case : null;
  if (!row.weighed) return null;
  return unit === 'litres' ? tons * 1000 : tons;
}

export function show(value: number | null | undefined, unit: Unit): string {
  if (value == null || !Number.isFinite(value)) return '—';
  if (unit === 'tons') return `${decimal(value, 2)} t`;
  if (unit === 'litres') return `${whole(value)} L`;
  if (unit === 'cases') return `${whole(value)} cs`;
  return `${whole(value)} pcs`;
}

/** A unit-scale sum across rows, skipping the rows the unit does not exist for. */
export function total(
  rows: readonly PlanSku[],
  unit: Unit,
  pick: (row: PlanSku) => [number, number],
): number {
  return rows.reduce((sum, row) => sum + (amount(row, ...pick(row), unit) ?? 0), 0);
}
