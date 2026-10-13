import type { MaterialIndent } from '../types';
import { formatQty, parseCount, toNumber } from './store/storeFormat';

// The gate's counts for one vehicle of a purchase, shared by the gate's
// Material In dialog and the indent page.

/** The bought lines the gate is still waiting for. */
export function pendingArrivalLines(indent: MaterialIndent) {
  return indent.items.filter((item) => toNumber(item.pending_arrival_quantity) > 0);
}

/** Every box at what is still expected: a full delivery is one tap. */
export function fullArrivalCounts(indent: MaterialIndent): Record<number, string> {
  return Object.fromEntries(
    pendingArrivalLines(indent).map((item) => [
      item.id,
      String(toNumber(item.pending_arrival_quantity)),
    ]),
  );
}

/** A problem with the counts, or null when they can be sent. */
export function arrivalCountsError(indent: MaterialIndent, counts: Record<number, string>) {
  const lines = pendingArrivalLines(indent);
  const parsed = lines.map((item) => ({ item, value: parseCount(counts[item.id] ?? '') }));
  if (parsed.some(({ value }) => value === null || value < 0)) {
    return 'Write a number in every box. Write 0 if it did not come.';
  }
  const tooMany = parsed.find(
    ({ item, value }) => (value ?? 0) > toNumber(item.pending_arrival_quantity),
  );
  if (tooMany) {
    return `Only ${formatQty(tooMany.item.pending_arrival_quantity)} ${tooMany.item.unit} of ${tooMany.item.particulars} is still expected.`;
  }
  if (!parsed.some(({ value }) => (value ?? 0) > 0)) {
    return 'Nothing entered. Write how much of each item came.';
  }
  return null;
}

/** The counts as the gate-in API takes them: only the lines that came. */
export function arrivalPayloadItems(indent: MaterialIndent, counts: Record<number, string>) {
  return pendingArrivalLines(indent)
    .map((item) => ({ id: item.id, quantity: String(parseCount(counts[item.id] ?? '') ?? 0) }))
    .filter((row) => Number(row.quantity) > 0);
}

/** True when some of what is expected is not on this vehicle. */
export function isPartArrival(indent: MaterialIndent, counts: Record<number, string>) {
  return pendingArrivalLines(indent).some(
    (item) => (parseCount(counts[item.id] ?? '') ?? 0) < toNumber(item.pending_arrival_quantity),
  );
}
