/**
 * Lines as they are typed into a transfer request, when raising one or editing
 * one. Kept apart from `TransferLinesEditor` so fast refresh keeps working — a
 * module that exports both components and plain functions breaks it.
 */

import type { TransferRequestLine, TransferRequestLineInput } from '../../types';
import { isWholeUnit } from './transferFormat';

export interface DraftLine extends TransferRequestLineInput {
  key: string;
  /** What the source warehouse held when the item was picked — SAP's Qty in Whse. */
  onHand?: number;
  /** Held by this app's own open requests: the only thing netted off on hand. */
  appReserved?: number;
  /** `onHand` minus `appReserved` — the number safe to promise. May be negative. */
  freeToMove?: number;
  /** SAP's own IsCommited, shown as context and never subtracted. */
  committed?: number;
}

let lineSeq = 0;
const nextKey = () => `line-${(lineSeq += 1)}`;

export const newDraftLine = (): DraftLine => ({
  key: nextKey(),
  item_code: '',
  quantity: '',
});

/** A saved line, ready to edit. Its stock figures stay unknown until the item is picked again. */
export function draftFromLine(line: TransferRequestLine): DraftLine {
  return {
    key: nextKey(),
    item_code: line.item_code,
    item_name: line.item_name,
    uom: line.uom,
    from_warehouse: line.from_warehouse,
    to_warehouse: line.to_warehouse,
    quantity: String(Number(line.requested_qty)),
  };
}

/** The lines that would be sent: an item and a quantity above zero. */
export function filledLines(lines: DraftLine[]): DraftLine[] {
  return lines.filter((l) => l.item_code.trim() && Number(l.quantity) > 0);
}

/**
 * A fraction of a discrete unit is refused server-side, so do not let it be
 * submitted — SAP itself would accept 0.993 PCS without complaint.
 */
export function hasFractionalWholeUnit(lines: DraftLine[]): boolean {
  return lines.some((l) => isWholeUnit(l.uom) && !Number.isInteger(Number(l.quantity)));
}

export function toLineInputs(lines: DraftLine[]): TransferRequestLineInput[] {
  return lines.map((line) => ({
    item_code: line.item_code,
    item_name: line.item_name,
    uom: line.uom,
    from_warehouse: line.from_warehouse,
    to_warehouse: line.to_warehouse,
    quantity: Number(line.quantity),
  }));
}

/**
 * Whether the lines still say what SAP's request says: the same items, in the
 * same order, at the same quantities and warehouses. The backend only replaces
 * SAP's request when they do not, so neither does the confirmation.
 */
export function sameAsSaved(lines: DraftLine[], saved: TransferRequestLine[]): boolean {
  return (
    lines.length === saved.length &&
    lines.every((line, i) => {
      const was = saved[i];
      return (
        line.item_code.trim() === was.item_code &&
        Number(line.quantity) === Number(was.requested_qty) &&
        (line.from_warehouse ?? '') === was.from_warehouse &&
        (line.to_warehouse ?? '') === was.to_warehouse
      );
    })
  );
}
