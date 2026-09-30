import type {
  MaintenanceDecimal,
  MaintenanceSpare,
  MaterialIndent,
  SpareMovement,
} from '../../types';

export function toNumber(value: MaintenanceDecimal | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatQty(value: MaintenanceDecimal | null | undefined) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 3 }).format(toNumber(value));
}

export function formatDay(iso: string) {
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(new Date(iso));
}

/** The lines that were bought: what the store is waiting to count in. */
export function linesToReceive(indent: MaterialIndent) {
  return indent.items.filter((item) => toNumber(item.shortfall_quantity) > 0);
}

/**
 * "Zig zag tile (Yellow 80mm)": the name receiving gives the stock item, so the
 * same tile in two colours reads as two lines, not one said twice.
 */
export function lineLabel(line: MaterialIndent['items'][number]) {
  return line.specification ? `${line.particulars} (${line.specification})` : line.particulars;
}

/** A count typed into a box: a finite number, or null when it is not one. */
export function parseCount(text: string) {
  if (text.trim() === '') return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}

export type StockLevel = 'below' | 'empty' | 'low' | 'ok';

/**
 * Below zero when more went out than the store has on record (allowed until
 * its real stock is entered); finished at zero; low at or under the "warn me"
 * level, when one is set. (The API's `is_low_stock` calls any item with no
 * level "low".)
 */
export function stockLevel(spare: MaintenanceSpare): StockLevel {
  const stock = toNumber(spare.current_stock);
  if (stock < 0) return 'below';
  if (stock <= 0) return 'empty';
  const warnAt = toNumber(spare.reorder_level);
  return warnAt > 0 && stock <= warnAt ? 'low' : 'ok';
}

/** Common store units; the box still takes anything typed. */
export const STORE_UNITS = ['NOS', 'PCS', 'KG', 'LTR', 'MTR', 'BOX', 'SET', 'PAIR', 'ROLL', 'BAG'];

export interface HistoryLine {
  id: number;
  day: string;
  /** Signed change to what is on the shelf. */
  change: number;
  text: string;
  by: string;
}

/**
 * One line per shelf change. CONSUME is left out: it records a work order
 * using what the store already gave it, so the shelf did not move.
 */
export function historyLines(movements: SpareMovement[]): HistoryLine[] {
  return movements
    .filter((movement) => movement.movement_type !== 'CONSUME')
    .map((movement) => {
      const qty = toNumber(movement.quantity);
      let change = qty;
      let text = movement.remarks;
      switch (movement.movement_type) {
        case 'RECEIPT':
          // Receiving writes "Material indent MI-20260930-0001".
          text = movement.remarks
            ? `Received (${movement.remarks.replace(/^Material indent\s*/, '')})`
            : 'Received';
          break;
        case 'ISSUE':
          change = -qty;
          text =
            movement.remarks ||
            (movement.work_order_no ? `Work order ${movement.work_order_no}` : 'Given out');
          break;
        case 'RETURN':
          // A gate pass writes "Back from gate pass RGP/…" or "Gate pass … cancelled".
          text = movement.work_order_no
            ? `Returned from ${movement.work_order_no}`
            : movement.remarks || 'Returned';
          break;
        case 'ADJUSTMENT':
          // The adjust action writes "Decrease from 12 to 10. <reason>".
          if (movement.remarks.startsWith('Decrease')) change = -qty;
          text =
            movement.remarks === 'Opening stock'
              ? 'Opening stock'
              : `Counted: ${movement.remarks.replace(/^(Increase|Decrease) from \S+ to \S+\.\s*/, '')}`;
          break;
      }
      return {
        id: movement.id,
        day: formatDay(movement.created_at),
        change,
        text,
        by: movement.performed_by_name,
      };
    });
}
