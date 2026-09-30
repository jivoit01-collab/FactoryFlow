/**
 * Laying a day's production QC checks out as the paper record: shared by the
 * on-screen sheet and its print, so the two always show the same rows.
 */

import type { ProductionQCEntry, ProductionQCResult } from '../types/productionQC.types';

/** Time columns on one printed page — the paper form has ten. */
export const COLUMNS_PER_PAGE = 10;

export interface SheetRow {
  key: string;
  name: string;
  uom: string;
  sequence: number;
  byEntry: Map<number, ProductionQCResult>;
}

/** The checks as the sheet's columns: in the order they were made. */
export function sheetColumns(entries: ProductionQCEntry[]): ProductionQCEntry[] {
  return [...entries].sort(
    (a, b) => new Date(a.checked_at).getTime() - new Date(b.checked_at).getTime() || a.id - b.id,
  );
}

/** The union of the parameters the day's checks read, in their order on the form. */
export function sheetRows(entries: ProductionQCEntry[]): SheetRow[] {
  const rows = new Map<string, SheetRow>();
  entries.forEach((entry) => {
    entry.results.forEach((result) => {
      const key = result.parameter_code || result.parameter_name;
      const row = rows.get(key) ?? {
        key,
        name: result.parameter_name,
        uom: result.uom,
        sequence: result.sequence,
        byEntry: new Map(),
      };
      row.sequence = Math.min(row.sequence, result.sequence);
      row.byEntry.set(entry.id, result);
      rows.set(key, row);
    });
  });
  return [...rows.values()].sort((a, b) => a.sequence - b.sequence || a.name.localeCompare(b.name));
}

/** "17:30", the time a check was made. */
export const sheetTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

/** YYYY-MM-DD as the forms write it, DD-MM-YYYY. */
export const formDate = (day: string) => day.split('-').reverse().join('-');
