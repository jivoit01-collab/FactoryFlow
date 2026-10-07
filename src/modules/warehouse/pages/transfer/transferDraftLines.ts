/**
 * Lines as they are typed into a transfer request, when raising one or editing
 * one. Kept apart from `TransferLinesEditor` so fast refresh keeps working — a
 * module that exports both components and plain functions breaks it.
 */

import type { TransferRequestLine, TransferRequestLineInput } from '../../types';
import { isWholeUnit, qty } from './transferFormat';

/** A batch picked on the form, its quantity as typed. */
export interface DraftBatch {
  batch_number: string;
  quantity: string;
}

export interface DraftLine extends TransferRequestLineInput {
  key: string;
  /** SAP's ManBtchNum for the item — only these lines have batches to pick. */
  isBatchManaged?: boolean;
  /**
   * Batches picked for this line, in shelf order (oldest first). That order is
   * the one the server cuts in when the approver approves less, so the newest
   * pick gives way first. Empty or absent: oldest first, at posting.
   */
  picks?: DraftBatch[];
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
    isBatchManaged: line.is_batch_managed,
    picks: (line.chosen_batches ?? []).map((b) => ({
      batch_number: b.batch_number,
      quantity: String(Number(b.quantity)),
    })),
  };
}

/** The picks with a quantity above zero — a blank or 0 is not a pick. */
export function pickedBatches(line: DraftLine): DraftBatch[] {
  return (line.picks ?? []).filter((b) => Number(b.quantity) > 0);
}

export function pickedTotal(line: DraftLine): number {
  return pickedBatches(line).reduce((sum, b) => sum + Number(b.quantity), 0);
}

/**
 * Set what is taken from one batch, keeping the picks in `shelfOrder`. A batch
 * picked earlier that is no longer on the shelf stays, after the rest, so the
 * picker can show it and it can be cleared.
 */
export function withPick(
  picks: DraftBatch[],
  shelfOrder: string[],
  batchNumber: string,
  quantity: string,
): DraftBatch[] {
  const typed = new Map(picks.map((b) => [b.batch_number, b.quantity]));
  typed.set(batchNumber, quantity);
  const order = [
    ...shelfOrder,
    ...[...typed.keys()].filter((number) => !shelfOrder.includes(number)),
  ];
  return order
    .filter((number) => (typed.get(number) ?? '') !== '')
    .map((number) => ({ batch_number: number, quantity: typed.get(number) as string }));
}

const TOLERANCE = 0.0005;

/** Lines whose picked batches do not add up to the line — the server refuses those. */
export function batchProblems(lines: DraftLine[]): string[] {
  return lines.flatMap((line) => {
    if (!pickedBatches(line).length) return [];
    const total = pickedTotal(line);
    const wanted = Number(line.quantity) || 0;
    return Math.abs(total - wanted) > TOLERANCE
      ? [`${line.item_code}: the batches picked add up to ${qty(total)}, but ${qty(wanted)} is asked for.`]
      : [];
  });
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
  return lines.map((line) => {
    const picked = pickedBatches(line);
    return {
      item_code: line.item_code,
      item_name: line.item_name,
      uom: line.uom,
      from_warehouse: line.from_warehouse,
      to_warehouse: line.to_warehouse,
      quantity: Number(line.quantity),
      // Sent in full on every save, so leaving it out clears an earlier pick.
      ...(picked.length
        ? {
            batches: picked.map((b) => ({
              batch_number: b.batch_number,
              quantity: Number(b.quantity),
            })),
          }
        : {}),
    };
  });
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

/**
 * Whether each line is still pinned to the batches it was saved with. Only
 * meaningful when `sameAsSaved` holds — the lines then pair up one to one.
 * Batches never reach SAP, so a change here alone saves without replacing
 * SAP's request.
 */
export function sameBatchesAsSaved(lines: DraftLine[], saved: TransferRequestLine[]): boolean {
  const key = (picks: { batch_number: string; quantity: string }[]) =>
    picks.map((b) => `${b.batch_number}=${Number(b.quantity)}`).join('|');
  return (
    lines.length === saved.length &&
    lines.every(
      (line, i) =>
        key(pickedBatches(line)) ===
        key((saved[i].chosen_batches ?? []).filter((b) => Number(b.quantity) > 0)),
    )
  );
}
